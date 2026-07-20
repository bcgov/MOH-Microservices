import http from "http";
import winston from "winston";
const { format } = winston;
import stringify from "json-stringify-safe";
import moment from "moment";

export const winstonLogger = winston.createLogger({
  format: format.combine(format.splat(), format.simple()),
  transports: [new winston.transports.Console()],
});

/**
 * General deny access handler
 * @param message
 * @param res
 * @param req
 */
export const denyAccess = (message, res, req) => {
  logSplunkError(
    message +
      " - access denied: url: " +
      stringify(req.originalUrl) +
      "  request: " +
      stringify(req.headers)
  );

  res.writeHead(401);
  res.end();
};

export const logSplunkError = (message) => {
  // log locally
  winstonLogger.error(message);

  var body = JSON.stringify({
    message: message,
  });

  var options = {
    hostname: process.env.LOGGER_HOST,
    port: process.env.LOGGER_PORT,
    path: "/log",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Api-Token " + process.env.SPLUNK_AUTH_TOKEN,
      "Content-Length": Buffer.byteLength(body),
      logsource: process.env.HOSTNAME,
      timestamp: moment().format("DD-MMM-YYYY"),
      program: "msp-service",
      severity: "error",
    },
  };

  var req = http.request(options, function (res) {
    res.setEncoding("utf8");
    res.on("data", function (chunk) {
      console.log("Body chunk: " + JSON.stringify(chunk));
    });
    res.on("end", function () {
      console.log("End of chunks");
    });
  });

  req.on("error", function (e) {
    console.error("error sending to splunk-forwarder: " + e.message);
  });

  // write data to request body
  req.write(body);
  req.end();
};

export const logSplunkInfo = (message) => {
  // log locally
  winstonLogger.info(message);

  var body = JSON.stringify({
    message: message,
  });

  var options = {
    hostname: process.env.LOGGER_HOST,
    port: process.env.LOGGER_PORT,
    path: "/log",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Splunk " + process.env.SPLUNK_AUTH_TOKEN,
      "Content-Length": Buffer.byteLength(body),
      logsource: process.env.HOSTNAME,
      timestamp: moment().format("DD-MMM-YYYY"),
      method: "MSP-Service - Pass Through",
      program: "msp-service",
      severity: "info",
    },
  };

  var req = http.request(options, function (res) {
    res.setEncoding("utf8");
    res.on("data", function (chunk) {
      console.log("Body chunk: " + JSON.stringify(chunk));
    });
    res.on("end", function () {
      console.log("End of chunks");
    });
  });

  req.on("error", function (e) {
    console.error("error sending to splunk-forwarder: " + e.message);
  });

  // write data to request body
  req.write(body);
  req.end();
};
