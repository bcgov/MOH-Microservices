import https from "https";
import http from "http";
import jwt from "jsonwebtoken";
import stringify from "json-stringify-safe";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

import { winstonLogger, denyAccess, logSplunkError, logSplunkInfo } from "./helper.js";

const SERVICE_PORT = process.env.PORT || 8080;

//
// Generate token for monitoring apps
//
if (
  process.env.USE_AUTH_TOKEN &&
  process.env.USE_AUTH_TOKEN == "true" &&
  process.env.AUTH_TOKEN_KEY &&
  process.env.AUTH_TOKEN_KEY.length > 0
) {
  var monitoringToken = jwt.sign(
    {
      data: { nonce: "status" },
    },
    process.env.AUTH_TOKEN_KEY
  );
  logSplunkInfo("Monitoring token: " + monitoringToken);
}

//
// Validate environment variables
//

//in Node, these should be process.env variables
//in OpenShift, these should be environment variables in the pod/deployment
//either way, if they're invalid, we want to know immediately so we can fix them

if (!process.env.TARGET_URL) {
  //msp-service can't redirect traffic unless a destination is defined
  throw Error("No TARGET_URL specified");
}
if (!URL.canParse(process.env.TARGET_URL)) {
  //msp-service can't redirect traffic to an invalid url
  throw Error(`TARGET_URL is not a valid URL: ${process.env.TARGET_URL}`);
}

if (!process.env.NOUN_JSON) {
  //msp-service needs this to verify the incoming request URL structure
  //passing them down as an env variable lets us configure different ones for different OpenShift namespaces
  //this lets us use one msp-service codebase for multiple projects
  throw Error("No NOUN_JSON specified");
}

try {
  // Try to parse NOUN_JSON
  JSON.parse(process.env.NOUN_JSON);
} catch (err) {
  throw Error(`NOUN_JSON is not valid JSON: ${process.env.NOUN_JSON}. Error: ${err}`);
}

//
// Init express
//
var app = express();

// Add status endpoint
app.get("/status", function (req, res) {
  res.send("OK");
});

// health and readiness check
app.get("/hello", function (req, res) {
  res.status(200).end();
});

app.get("/health", function (req, res) {
  res.status(200).end();
});

//
// CAPTCHA Authorization, ALWAYS first
//
app.use("/", function (req, res, next) {
  // Log it
  // logSplunkInfo("incoming: ", req.method, req.headers.host, req.url, res.statusCode, req.headers["x-authorization"]);
  logSplunkInfo("incoming: " + req.url);
  // logSplunkInfo(" x-authorization: " + req.headers["x-authorization"]);

  // Get authorization from browser
  var authHeaderValue = req.headers["x-authorization"];

  // Delete it because we add HTTP Basic later
  delete req.headers["x-authorization"];

  // Delete any attempts at cookies
  delete req.headers["cookie"];

  // Validate token if enabled
  if (
    process.env.USE_AUTH_TOKEN &&
    process.env.USE_AUTH_TOKEN == "true" &&
    process.env.AUTH_TOKEN_KEY &&
    process.env.AUTH_TOKEN_KEY.length > 0
  ) {
    // Ensure we have a value
    if (!authHeaderValue) {
      denyAccess("missing header", res, req);
      return;
    }

    // Parse out the token
    var token = authHeaderValue.replace("Bearer ", "");

    var decoded = null;
    try {
      // Decode token
      decoded = jwt.verify(token, process.env.AUTH_TOKEN_KEY);
    } catch (err) {
      logSplunkError("jwt verify failed, x-authorization: " + authHeaderValue + "; err: " + err);
      denyAccess("jwt unverifiable", res, req);
      return;
    }

    // Ensure we have a nonce
    if (decoded == null || decoded.data.nonce == null || decoded.data.nonce.length < 1) {
      denyAccess("nonce not included in decrypted auth token", res, req);
      return;
    }

    // Check against the resource URL
    // typical URL:
    //    /MSPDESubmitApplication/2ea5e24c-705e-f7fd-d9f0-eb2dd268d523?programArea=enrolment

    let pathname = req.url;

    try {
      URL.canParse(pathname);
    } catch (err) {
      denyAccess("could not parse URL", res, req);
      return;
    }

    var pathnameParts = pathname.split("/");

    const nounObject = JSON.parse(process.env.NOUN_JSON);
    const nounArray = Object.keys(nounObject);

    let selectedNoun = null;
    for (const element of nounArray) {
      if (pathnameParts.includes(element)) {
        selectedNoun = element;
        break;
      }
    }

    if (!selectedNoun) {
      denyAccess("missing noun or resource id", res, req);
      return;
    }

    //uuids always have the same format, so we can use a regular expression to pick it out of the URL
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    //extract uuid from URL
    let urlUuid = null;
    for (const segment of pathnameParts) {
      if (uuidRegex.test(segment)) {
        urlUuid = segment;
        break;
      }
    }

    //select the skip options specific to the noun found in the URL
    const selectedOptions = nounObject[selectedNoun];

    //if URL doesn't have a uuid at the end, then the "skipUuidCheck" property needs to be true in order to proceed
    //if that property exists and is true, then the skip check is true
    //if that property doesn't exist, or if it does exist and is set to false, then set to false
    const skipUuid =
      Object.prototype.hasOwnProperty.call(selectedOptions, "skipUuidCheck") &&
      selectedOptions["skipUuidCheck"] === true
        ? true
        : false;

    //if the url doesn't have a uuid and there's no reason to skip the check, deny access
    if (!urlUuid && !skipUuid) {
      denyAccess(`application UUID not included in URL: ${pathname}`, res, req);
      return;
    }

    const jwtNonce = decoded.data.nonce;
    const skipMatch =
      Object.prototype.hasOwnProperty.call(selectedOptions, "skipUuidNonceMatchCheck") &&
      selectedOptions["skipUuidNonceMatchCheck"] === true
        ? true
        : false;

    //if UUID and JWT nonce don't match AND there's no reason to skip the check, deny access
    if (urlUuid !== jwtNonce && !skipUuid && !skipMatch) {
      denyAccess(`url uuid and jwt nonce are not equal: ${pathname}`, res, req);
      return;
    }
  }
  // OK it's valid let it pass thru this event
  next(); // pass control to the next handler
});

// Create new HTTPS.Agent for mutual TLS purposes
if (process.env.USE_MUTUAL_TLS && process.env.USE_MUTUAL_TLS == "true") {
  var httpsAgentOptions = {
    key: new Buffer(process.env.MUTUAL_TLS_PEM_KEY_BASE64, "base64"),
    passphrase: process.env.MUTUAL_TLS_PEM_KEY_PASSPHRASE,
    cert: new Buffer(process.env.MUTUAL_TLS_PEM_CERT, "base64"),
  };

  var myAgent = new https.Agent(httpsAgentOptions);
}
//
// Create a HTTP Proxy server with a HTTPS target
//
var proxy = createProxyMiddleware({
  target: process.env.TARGET_URL || "http://localhost:3000",
  agent: myAgent || http.globalAgent,
  secure: process.env.SECURE_MODE || false,
  keepAlive: true,
  changeOrigin: true,
  auth: process.env.TARGET_USERNAME_PASSWORD || "username:password",
  logger: winstonLogger,

  //
  // Listen for the `error` event on `proxy`.
  //
  on: {
    error: (err, req, res) => {
      logSplunkError(
        "proxy error: " + err + "; req.url: " + req.url + "; status: " + res.statusCode
      );
      res.writeHead(500, {
        "Content-Type": "text/plain",
      });

      res.end("Error creating proxy middleware");
    },
    // eslint-disable-next-line no-unused-vars
    proxyReq: (proxyReq, req, res) => {
      winstonLogger.info("RAW proxyReq: ", stringify(proxyReq.headers));
      logSplunkInfo("RAW URL: " + req.url + "; RAW headers: ", stringify(req.headers));
      // winstonLogger.info('RAW options: ', stringify(options));
    },
    // eslint-disable-next-line no-unused-vars
    proxyRes: (proxyRes, req, res) => {
      winstonLogger.info("RAW Response from the target: " + stringify(proxyRes.headers));

      // Delete set-cookie
      delete proxyRes.headers["set-cookie"];
    },
    proxyReqWs: () => {},
    open: () => {},
    close: () => {},
  },
});

// Add in proxy AFTER authorization
app.use("/", proxy);

// Start express
app.listen(SERVICE_PORT);

logSplunkInfo(`msp-service server started on port ${SERVICE_PORT}`);
