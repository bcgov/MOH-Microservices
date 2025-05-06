import express from "express";
import * as env from "./env.js";
import {
  verifyPrivateKey,
  verifyIncomingNonce,
  generateCaptcha,
  signObject,
  winstonLogger,
  decryptJWE,
  encryptJWE,
  verifyIsJWE,
} from "./helper.js";

//verify PRIVATE_KEY
verifyPrivateKey(env.PRIVATE_KEY); //this function stops the service if the private key is malformed

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

winstonLogger.info(`MyGov Captcha Service listening at http://localhost:${env.SERVICE_PORT}`);
winstonLogger.info(`Log level is at: ${env.LOG_LEVEL}`);

// health and readiness check
app.get("/hello", function (req, res) {
  res.status(200).send("OK").end();
});

app.get("/status", function (req, res) {
  res.status(200).send("OK").end();
});

app.post("/captcha/audio", function (req, res) {
  let response = {};
  return res.send(response);
});

app.post("/captcha", async function (req, res) {
  //check nonce is formatted correctly, return error if it's not

  if (!req || !req.body || !Object.hasOwn(req.body, "nonce") || !req.body.nonce) {
    winstonLogger.debug(`Failed to generate captcha; no nonce.`);
    return res.status(400).send({ reason: "Missing nonce" });
  }

  winstonLogger.debug(`/captcha body: ${JSON.stringify(req.body)}`);

  if (!verifyIncomingNonce(req.body.nonce)) {
    winstonLogger.debug(
      `Failed to generate captcha; nonce does not match expected format. Provided: ${req.body.nonce}`
    );
    return res.status(400).send({ reason: "Incorrect nonce format" });
  }

  //otherwise return captcha payload
  const captcha = await generateCaptcha();

  if (!captcha || (captcha && !captcha.data)) {
    // Something bad happened with captcha generation.
    winstonLogger.error(`Failed to generate captcha; svgCaptcha action failed.`);
    return res.status(500).send({ reason: "Failed to generate captcha, please try again" });
  }

  //If the captcha image generated successfully, then we're ready to prepare it for the user
  //We'll put it in a JSON object along with an encrypted JWE token, which contains the real captcha answer in a format the user can't read
  //Then when the user submits the answer, we'll decrypt the JWE and compare the expected answer with what the user submitted

  let encryptedData;
  try {
    encryptedData = await encryptJWE(req.body.nonce, captcha);
  } catch (error) {
    winstonLogger.error(`Failed to encrypt JWE: ${JSON.stringify(error)}`);
    return res.status(500).send({ reason: "Failed to generate captcha, please try again" });
  }

  const payload = {
    nonce: req.body.nonce,
    captcha: captcha.data,
    validation: encryptedData,
  };

  return res.status(200).send(payload);
});

app.post("/verify/captcha", async function (req, res) {
  if (!req || !req.body || !Object.hasOwn(req.body, "nonce") || !req.body.nonce) {
    winstonLogger.debug(`Failed to verify captcha; no nonce.`);
    return res.status(400).send({ reason: "Missing nonce" });
  }

  if (!verifyIncomingNonce(req.body.nonce)) {
    winstonLogger.debug(
      `Failed to verify request; nonce does not match expected format. Provided: ${req.body.nonce}`
    );
    return res.status(400).send({ reason: "Incorrect nonce format" });
  }

  //If Bypass_Answer is set and user input matches, pass the captcha test
  if (env.BYPASS_ANSWER && env.BYPASS_ANSWER.length > 0 && env.BYPASS_ANSWER === req.body.answer) {
    winstonLogger.debug(`Captcha bypassed! Creating JWT.`);

    const result = await signObject(req.body.nonce, env.SECRET, env.JWT_SIGN_EXPIRY);

    if (!result) {
      winstonLogger.error(`Failed to sign JWT. `);
      return res.status(500).send("Failed to verify captcha, please try again");
    }

    winstonLogger.debug(`Created JWT: ${JSON.stringify(result)} `);
    return res.status(200).send(result);
  }

  // Otherwise prepare to attempt decrypt

  if (!Object.hasOwn(req.body, "validation") || !req.body.validation) {
    winstonLogger.debug(
      `Failed to verify request; missing validation property. Provided: ${JSON.stringify(req.body)}`
    );
    return res.status(400).send({ reason: "Incorrect validation format" });
  }

  if (!verifyIsJWE(req.body.validation)) {
    winstonLogger.debug(
      `Failed to decrypt captcha; not JWE format. Provided: ${JSON.stringify(req.body.validation)}`
    );
    return res.status(400).send({ reason: "Incorrect validation format" });
  }

  // Attempt decrypt
  const decryptedRequest = await decryptJWE(req.body.validation, env.PRIVATE_KEY);

  if (!decryptedRequest) {
    winstonLogger.error(`Failed to decrypt captcha. `);
    return res.status(500).send("Failed to decrypt captcha");
  }

  winstonLogger.debug(`verifyCaptcha decrypted ${JSON.stringify(decryptedRequest)}`);

  if (decryptedRequest.expiry < Date.now()) {
    winstonLogger.debug(`Captcha expired: ${decryptedRequest.expiry},  now: ${Date.now()}`);
    return res.status(400).send("Captcha expired");
  }

  if (decryptedRequest.nonce !== req.body.nonce) {
    winstonLogger.debug(
      `Nonce incorrect, expected: ${decryptedRequest.nonce}, provided ${req.body.nonce}`
    );
    return res.status(400).send("Invalid submission");
  }

  if (decryptedRequest.answer.toLowerCase() !== req.body.answer.toLowerCase()) {
    winstonLogger.debug(
      `Captcha answer incorrect, expected: ${decryptedRequest.answer}, provided ${req.body.answer}`
    );
    return res.status(400).send("Invalid submission");
  }

  //If the captcha verifies correctly, then we return a signed JWT with the nonce and an expiry
  //The msp-service will check for this JWT before it allows API calls to submit forms

  winstonLogger.debug(`Captcha verified! Creating JWT ${JSON.stringify(decryptedRequest)}`);

  const result = await signObject(req.body.nonce, env.SECRET, env.JWT_SIGN_EXPIRY);

  if (!result) {
    winstonLogger.error(`Failed to sign JWT. `);
    return res.status(500).send("Failed to sign JWT");
  }

  winstonLogger.debug(`Created JWT: ${JSON.stringify(result)} `);
  return res.status(200).send(result);
});

app.get("/", (req, res) => {
  return res.status(200).send("Hello world");
});

app.listen(env.SERVICE_PORT);
