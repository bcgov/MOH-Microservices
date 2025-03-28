/*=============================================
=                Dependencies                 =
=============================================*/
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import safeStringify from "json-stringify-safe";
import express from "express";
import serveIndex from "serve-index";
import { Agent, fetch } from "undici";
import basicAuth from "express-basic-auth";
import { generateTimeout, checkEnvBoolean } from "./helpers.js";

/*=============================================
=      Environment Variable Configuration     =
=============================================*/
const SERVICE_IP = process.env.SERVICE_IP || "localhost";
const SERVICE_PORT = process.env.SERVICE_PORT || 8080;
const FILE_LOG_LEVEL = process.env.FILE_LOG_LEVEL || "info";
const SPLUNK_URL = process.env.SPLUNK_URL || null;
const RETRY_COUNT = parseInt(process.env.RETRY_COUNT, 10) || 0;
const HOST_NAME = process.env.HOSTNAME || "?";
const SERVICE_AUTH_TOKEN = process.env.SERVICE_AUTH_TOKEN || "NO_TOKEN";
const SPLUNK_AUTH_TOKEN = process.env.SPLUNK_AUTH_TOKEN || null;
const USE_SPLUNK = checkEnvBoolean(process.env.USE_SPLUNK);
const SERVICE_USE_AUTH = checkEnvBoolean(process.env.SERVICE_USE_AUTH);
const ONLY_LOG_WHEN_SPLUNK_FAILS = checkEnvBoolean(process.env.ONLY_LOG_WHEN_SPLUNK_FAILS);
const MONITOR_USERNAME = process.env.MONITOR_USERNAME || "";
const MONITOR_PASSWORD = process.env.MONITOR_PASSWORD || "";
const CA_CERT = process.env.CA_CERT || "";

//Defaults to use 750mb total storage.
const MAX_FILES = parseInt(process.env.MAX_FILES, 10) || 10;
const MAX_BYTE_SIZE_PER_FILE = parseInt(process.env.MAX_BYTE_SIZE_PER_FILE, 10) || 1024 * 1024 * 75;

//Should not end with a /, "/var/logs" or "logs" is good.
const LOG_DIR_NAME = process.env.LOG_DIR_NAME || null;
const APPEND_POD_NAME_TO_FILE = process.env.APPEND_POD_NAME_TO_FILE == "true";
const FILE_LOG_NAME = LOG_DIR_NAME
  ? LOG_DIR_NAME + "/sf" + (APPEND_POD_NAME_TO_FILE ? "-" + HOST_NAME : "") + ".log"
  : "./logs/sf" + (APPEND_POD_NAME_TO_FILE ? "-" + HOST_NAME : "") + ".log";

if (process.env.SERVICE_PORT < 1 || process.env.SERVICE_PORT > 65535) {
  //port number must be valid
  throw new Error(
    "Port must be an integer between 1 and 65535, found: " + process.env.SERVICE_PORT
  );
}

if (!process.env.SPLUNK_URL) {
  throw Error("No SPLUNK_URL specified-- can't forward logs without a destination");
}

if (!URL.canParse(process.env.SPLUNK_URL)) {
  throw Error(`SPLUNK_URL is not a valid URL: ${process.env.SPLUNK_URL}`);
}

if (!process.env.CA_CERT) {
  throw Error(`No CA_CERT specified-- this is needed for auth`);
}

if (!process.env.SPLUNK_AUTH_TOKEN) {
  throw Error(`No SPLUNK_AUTH_TOKEN specified-- this is needed for auth`);
}

if (!process.env.LOG_DIR_NAME) {
  throw Error(`No LOG_DIR_NAME specified-- can't serve logs at /monitor without a log source`);
}

/*=============================================
=            APPLICATION CONFIGURATION        =
=============================================*/
// turn off self-cert check
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Daily rotate file transport for logs
var transport = {
  filename: "%DATE%sf.log",
  dirname: LOG_DIR_NAME,
  datePattern: "yyyy-MM-DD-",
  frequency: "5s",
  zippedArchive: false,
  prepend: true,
  level: FILE_LOG_LEVEL,
  timestamp: true,
  auditFile: `${LOG_DIR_NAME}/${FILE_LOG_LEVEL}-audit.json`,
  maxSize: MAX_BYTE_SIZE_PER_FILE,
  maxFiles: MAX_FILES,
};

// Winston Logger init
var winstonLogger = new winston.createLogger({
  level: FILE_LOG_LEVEL,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new DailyRotateFile(transport)],
});

// remove console if not in debug mode
if (FILE_LOG_LEVEL != "debug") {
  winston.remove(winston.transports.Console);
}

/*=============================================
=              Main Application               =
=============================================*/
// Init app
const app = express();
if (process.env.NODE_ENV != "production" || process.env.CORS_ALLOW_ALL == "true") {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
}

//lets us parse incoming request body with .json(), encode urls
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(SERVICE_PORT, SERVICE_IP, function () {
  winstonLogger.info(
    `START log server (${HOST_NAME})-  loglevel(${FILE_LOG_LEVEL}) fileLocation(${FILE_LOG_NAME})`
  );
});

// health and readiness check
app.get("/hello", function (req, res) {
  res.status(200).end();
});

// handle posts to /log endpoint
app.post("/log", function (req, res) {
  getLog(req)
    .then(function (mess) {
      res.status(200);
      return res.send(mess);
    })
    .catch(function (mess) {
      res.status(500);
      winstonLogger.error(`/log error occurred: ${mess}`);
      return res.send("An error has occured");
    });
});

//Setup the password protected /monitor
winstonLogger.debug("Serving index files from " + LOG_DIR_NAME);
const users = {};
users[MONITOR_USERNAME] = MONITOR_PASSWORD;
app.get(
  "/monitor",
  basicAuth({
    users,
    challenge: true, //Show popup box asking for credentials
  })
);
app.use("/monitor", serveIndex(LOG_DIR_NAME));
app.use(
  "/monitor",
  express.static(LOG_DIR_NAME, {
    //Get browser to display instead of download weird filenames, *.log.1
    setHeaders: (res) => {
      winstonLogger.debug("Getting monitored files for " + LOG_DIR_NAME);
      res.set("content-type", "text/plain; charset=UTF-8");
    },
  })
);
//not sure I need this
// app.use(function (err, req, res, next) {
//   console.log("potato", err)
//   winstonLogger.info(err, req);
//   res.status(500).send("An error has occured.");
// });

winstonLogger.info("Splunk Forwarder started on host: " + SERVICE_IP + "  port: " + SERVICE_PORT);

const sendLog = async (payload) => {
  //format payload
  const body = {
    event: {
      message: payload.message,
      severity: payload.severity || "info",
    },
    time: payload.time || Date.now().toString(),
  };

  const headers = {};

  headers["Content-Type"] = "application/json";
  headers["Authorization"] = "Api-Token " + SPLUNK_AUTH_TOKEN;

  const agent = new Agent({
    connect: {
      ca: CA_CERT,
    },
  });

  let latestResponse = "";

  winstonLogger.debug(`'Request body: ${JSON.stringify(body)}`);

  //try sending the logs multiple times with a for loop
  for (let i = 0; i < RETRY_COUNT; i++) {
    const response = await fetch(SPLUNK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      agent,
    });
    const parsedResponse = await response.text();

    latestResponse = await response.status;

    if (response.ok) {
      //if the response is OK, eg. 200-level, log that the response was successful and exit
      winstonLogger.debug(`successfully reached ${SPLUNK_URL}! Response ${response.status}`);
      //return exits both the for loop and the entire sendLog() function here
      return;
    } else {
      //if the response is not ok, log that and wait for the timeout before trying again
      winstonLogger.debug(
        `failed to reach ${SPLUNK_URL}. Response status: ${response.status} Response: ${JSON.stringify(parsedResponse)}`
      );
      //the generated timeout uses the loop index to determine the wait time
      //eg the first try should happen quickly, and subsequent tries should be more spread out
      const timeout = generateTimeout(i);
      winstonLogger.debug(`waiting ${timeout} milliseconds to try again`);
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
  }
  // if the for loop never exits due to a successful response, default to an error
  throw Error(
    `Couldn't reach log forwarder (tried ${RETRY_COUNT} times and gave up). Last response received: ${latestResponse}`
  );
};

// get a log
const getLog = (req) => {
  return new Promise(function (resolve, reject) {
    var authorized = false;

    if (SERVICE_USE_AUTH && req.get("Authorization") === `Splunk ${SERVICE_AUTH_TOKEN}`) {
      authorized = true;
    }
    if (authorized || !SERVICE_USE_AUTH) {
      // extract stuff
      const mess = safeStringify(req.body);
      const host = req.get("host") || "?";
      const logsource = req.get("logsource") || "?";
      const fhost = req.get("http_x_forwarded_host") || "?";
      const refNo = req.get("referenceNumber") || "?";
      const applicationId = req.get("applicationId") || "?";
      const name = req.get("name") || "?";
      const tags = req.get("tags") || "?";
      const program = req.get("program") || "?";
      const times = req.get("timestamp") || "?";
      const http_host = req.get("http_host") || "?";
      const method = req.get("request_method") || "?";
      const forwarded = req.get("http_x_forwarded_for") || "?";
      const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || "?";
      const browser = req.headers["user-agent"];
      const severity = req.get("severity") || "?"; //orig

      const logString = `applicationId(${applicationId}) program(${program}) mess(${mess}) host(${host}) logsource(${logsource}) fhost(${fhost}) refNo(${refNo}) name(${name}) severity(${severity}) tags(${tags}) method(${method}) times(${times})  browser(${browser}) sourceIP(${ip}), http_host(${http_host}) http_x_forwarded_for(${forwarded}) pod(${HOST_NAME})`;

      // write to local filesystem
      if (!ONLY_LOG_WHEN_SPLUNK_FAILS && USE_SPLUNK) {
        winstonLogger.info(logString);
      }

      if (!USE_SPLUNK) {
        winstonLogger.info(logString);
        return resolve("success");
      } else {
        // forward to splunk
        var payload = {
          message: {
            applicationId: applicationId,
            program: program,
            log: mess,
            times: times,
            refNo: refNo,
            name: name,
            severity: severity,
            tags: tags,
            http_host: http_host,
            method: method,
            host: host,
            pod: HOST_NAME,
            forwardedHost: fhost,
            forwarded: forwarded,
            browserType: browser,
            sourceIP: ip,
            logsource: logsource,
          },
          // metadata: {
          //    sourceIP: "TBD",
          //    browserType: "TBD",
          //    etc: "TBD"
          //},
          severity: "info",
        };
        winstonLogger.debug("sending payload");
        sendLog(payload).catch((error) => {
          winstonLogger.error("unable to send logs: ", error);
          if (ONLY_LOG_WHEN_SPLUNK_FAILS) {
            winstonLogger.info(logString);
          }
        });

        winstonLogger.debug("sent payload");
        resolve("success");
      }
    } else {
      winstonLogger.info("unauthorized");
      winstonLogger.debug("received with headers: ", req.headers);
      reject("unauthorized");
    }
  });
};
