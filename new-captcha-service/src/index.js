import express from "express";
import * as env from "./env.js";
import {
  verifyPrivateKey,
  verifyIncomingNonce,
  verifyJwtExpiry,
  generateCaptcha,
  signObject,
  winstonLogger,
  decryptJWE,
  encryptJWE,
  verifyIsJWE,
  convertWavToMp3,
  getSpacedAnswer,
} from "./helper.js";
import * as text2wavModule from "text2wav";
const text2wav = text2wavModule.default;

//verify PRIVATE_KEY
verifyPrivateKey(env.PRIVATE_KEY); //this function stops the service if the private key is malformed
verifyJwtExpiry(env.JWT_SIGN_EXPIRY);

// try signing a JWT with env variables, throw an error if it fails
try {
  await signObject("testNonce", env.SECRET, env.JWT_SIGN_EXPIRY);
} catch (error) {
  throw Error(`Environment variables are invalid. 
    \n Please check env.SECRET and env.JWT_SIGN_EXPIRY for issues. 
    \n env.SECRET (should be string): ${env.SECRET}. \n env.JWT_SIGN_EXPIRY (should be numbers only): ${env.JWT_SIGN_EXPIRY} 
    \n Caught JWT error: '${error}'`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

winstonLogger.info(`MyGov Captcha Service listening at http://localhost:${env.SERVICE_PORT}`);
winstonLogger.info(`Log level is at: ${env.LOG_LEVEL}`);

// health and readiness check
app.get("/hello", function (req, res) {
  winstonLogger.debug(`Received request to /hello`);
  res.status(200).send("OK").end();
});

app.get("/status", function (req, res) {
  winstonLogger.debug(`Received request to /status`);
  res.status(200).send("OK").end();
});

app.post("/captcha/audio", async function (req, res) {
  winstonLogger.debug(`Received request to /captcha/audio`);

  if (!req || !req.body || !req.body.validation) {
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
  let decryptedRequest;
  try {
    decryptedRequest = await decryptJWE(req.body.validation, env.PRIVATE_KEY);
  } catch (error) {
    winstonLogger.debug(
      `Can't decrypt incoming JWE. Received error: "${error}", input ${JSON.stringify(req.body.validation)}`
    );
    return res.status(500).send("Failed to decrypt captcha request");
  }

  if (!decryptedRequest) {
    winstonLogger.error(`Failed to decrypt captcha. `);
    return res.status(500).send("Failed to decrypt captcha request");
  }

  winstonLogger.debug(`verifyCaptcha decrypted ${JSON.stringify(decryptedRequest)}`);

  winstonLogger.debug("Generate speech as WAV in ArrayBuffer");

  const spacedAnswer = getSpacedAnswer(decryptedRequest.answer);

  const captchaAudioText = `Please type in the following letters or numbers: ${spacedAnswer}`;

  //I chose the m8 voice because I thought it was the clearest/easiest to understand
  //but if you want to change it later, there are more here: https://github.com/abbr/text2wav.node.js/tree/master/espeak-ng-data/voices/!v
  let wav = await text2wav(captchaAudioText, { voice: "en+m8" });
  if (!wav) {
    winstonLogger.error(`Failed to generate wav file. `);
    return res.status(500).send("Failed to generate audio");
  }

  //convert wav to mp3
  let mp3;
  try {
    mp3 = await convertWavToMp3(wav);
  } catch (error) {
    winstonLogger.error(`Failed to convert wav to mp3. Error: ${error}`);
    return res.status(500).send("Failed to generate audio");
  }

  if (!mp3) {
    winstonLogger.error(`Failed to convert wav to mp3. `);
    return res.status(500).send("Failed to generate audio");
  }

  const buffer = Buffer.from(mp3);

  //write locally for testing
  // import fs from "fs";
  // const targetFile = fs.writeFileSync("./mytrack.mp3", buffer);

  const resultAudio = "data:audio/mp3;base64," + buffer.toString("base64");

  const payload = {
    audio: resultAudio,
  };
  return res.status(200).send(JSON.stringify(payload));
});

app.post("/captcha", async function (req, res) {
  winstonLogger.debug(`Received request to /captcha`);
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
    encryptedData = await encryptJWE(
      req.body.nonce,
      captcha,
      env.PRIVATE_KEY,
      env.CAPTCHA_SIGN_EXPIRY
    );
  } catch (error) {
    winstonLogger.error(`Failed to encrypt JWE. Error: ${JSON.stringify(error)}`);
    return res.status(500).send({ reason: "Failed to generate captcha, please try again" });
  }

  if (!encryptedData) {
    // Something bad happened with data encryption.
    winstonLogger.error(`Failed to encrypt JWE`);
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
  winstonLogger.debug(`Received request to /verify/captcha`);
  if (!req || !req.body || !Object.hasOwn(req.body, "nonce") || !req.body.nonce) {
    winstonLogger.debug(`Failed to verify captcha; no nonce.`);
    return res.status(400).send({ valid: false, reason: "Missing nonce" });
  }

  if (!verifyIncomingNonce(req.body.nonce)) {
    winstonLogger.debug(
      `Failed to verify request; nonce does not match expected format. Provided: ${req.body.nonce}`
    );
    return res.status(400).send({ valid: false, reason: "Incorrect nonce format" });
  }

  //If Bypass_Answer is set and user input matches it, pass the captcha test
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
    return res.status(400).send({ valid: false, reason: "Incorrect validation format" });
  }

  if (!verifyIsJWE(req.body.validation)) {
    winstonLogger.debug(
      `Failed to decrypt captcha; not JWE format. Provided: ${JSON.stringify(req.body.validation)}`
    );
    return res.status(400).send({ valid: false, reason: "Incorrect validation format" });
  }

  // Attempt decrypt
  let decryptedRequest;
  try {
    decryptedRequest = await decryptJWE(req.body.validation, env.PRIVATE_KEY);
  } catch (error) {
    winstonLogger.debug(
      `Can't decrypt incoming JWE. Received error: "${error}", input ${JSON.stringify(req.body.validation)}`
    );
    return res.status(500).send("Failed to decrypt captcha");
  }

  if (!decryptedRequest) {
    winstonLogger.error(`Failed to decrypt captcha. `);
    return res.status(500).send("Failed to decrypt captcha");
  }

  winstonLogger.debug(`verifyCaptcha decrypted ${JSON.stringify(decryptedRequest)}`);

  //The following responses need to return a 200 so the common library captcha component will handle them correclty

  if (decryptedRequest.expiry < Date.now()) {
    winstonLogger.debug(`Captcha expired: ${decryptedRequest.expiry},  now: ${Date.now()}`);
    return res.status(200).send({ valid: false, reason: "Captcha expired" });
  }

  if (decryptedRequest.nonce !== req.body.nonce) {
    winstonLogger.debug(
      `Nonce incorrect, expected: ${decryptedRequest.nonce}, provided ${req.body.nonce}`
    );
    return res.status(200).send({ valid: false, reason: "Invalid submission" });
  }

  if (decryptedRequest.answer.toLowerCase() !== req.body.answer.toLowerCase()) {
    winstonLogger.debug(
      `Captcha answer incorrect, expected: ${decryptedRequest.answer}, provided ${req.body.answer}`
    );
    return res.status(200).send({ valid: false, reason: "Invalid submission" });
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
