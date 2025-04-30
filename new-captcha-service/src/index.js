import express from "express";
import { generateDate, generateCaptcha } from "./helper.js";
import pkg from "node-jose";
const { JWE, JWK, JWS } = pkg;

//Environment variables
const SERVICE_PORT = 3000;
const CAPTCHA_SIGN_EXPIRY = 180;
//this is a test key for development purposes. Don't use in production
const PRIVATE_KEY = `{
  "kty": "oct",
  "kid": "gBdaS-G8RLax2qObTD94w",
  "use": "enc",
  "alg": "A256GCM",
  "k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"
}`;
const SECRET = "defaultSecret";
const LOG_LEVEL = "info";

//verify PRIVATE_KEY
try {
  JSON.parse(PRIVATE_KEY);
} catch (error) {
  console.log(
    `${generateDate()}`,
    "winston error: Failed to parse PRIVATE_KEY: ",
    JSON.stringify(error)
  );
  throw Error(`PRIVATE_KEY invalid (must be valid JSON, received ${PRIVATE_KEY})`);
}

let parsedKey = JSON.parse(PRIVATE_KEY);

if (!Object.prototype.hasOwnProperty.call(parsedKey, "kty")) {
  throw Error(`PRIVATE_KEY isn't a valid JWK (missing "kty" property, received ${PRIVATE_KEY})`);
}

if (!Object.prototype.hasOwnProperty.call(parsedKey, "use")) {
  throw Error(`PRIVATE_KEY isn't a valid JWK (missing "use" property, received ${PRIVATE_KEY})`);
}

if (!Object.prototype.hasOwnProperty.call(parsedKey, "alg")) {
  throw Error(`PRIVATE_KEY isn't a valid JWK (missing "alg" property, received ${PRIVATE_KEY})`);
}

if (!Object.prototype.hasOwnProperty.call(parsedKey, "k")) {
  throw Error(`PRIVATE_KEY isn't a valid JWK (missing "k" property, received ${PRIVATE_KEY})`);
}

if (parsedKey.kty !== "oct") {
  throw Error(
    `Please check your PRIVATE_KEY and try again ("kty" needs to equal "oct" for symmetrical encryption. Received ${PRIVATE_KEY})`
  );
}

if (parsedKey.use !== "enc") {
  throw Error(
    `Please check your PRIVATE_KEY and try again (This microservice uses symmetrical encryption, which means "use" needs to equal "enc". Received ${PRIVATE_KEY})`
  );
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(
  `${generateDate()} winston info: MyGov Captcha Service listening at http://localhost:${SERVICE_PORT}`
);
console.log(`${generateDate()} winston info: Log level is at: ${LOG_LEVEL}`);

const encryptJWE = async (nonce, captcha) => {
  const body = {
    nonce,
    answer: captcha.text,
    expiry: Date.now() + CAPTCHA_SIGN_EXPIRY * 60000,
  };

  console.log(`${generateDate()}`, "winston debug: to encrypt ", JSON.stringify(body));

  let buff = Buffer.from(JSON.stringify(body));
  try {
    let result = await JWE.createEncrypt(JSON.parse(PRIVATE_KEY)).update(buff).final();
    console.log(`${generateDate()}`, "winston debug: encrypted ", JSON.stringify(result));
    return result;
  } catch (error) {
    console.log(
      `${generateDate()}`,
      "winston error: Failed to encrypt JWE: ",
      JSON.stringify(error)
    );
    throw error;
  }
};

// health and readiness check
app.get("/hello", function (req, res) {
  res.status(200).end();
});

app.get("/status", function (req, res) {
  res.send("OK");
});

app.post("/captcha/audio", function (req, res) {
  let response = {};
  return res.send(response);
});

app.post("/captcha", async function (req, res) {
  console.log(`${generateDate()} winston debug: /captcha body: `, req.body);

  //check nonce is formatted correctly, return error if it's not
  if (!req.body || !Object.hasOwn(req.body, "nonce") || !req.body.nonce) {
    console.log(`${generateDate()}`, "winston debug: Failed to generate captcha; no nonce.");
    return res.status(400).send({ reason: "Missing nonce" });
  }


  //regex for nonce
  //alphanumeric characters in groups of 8, 4, 4, 4, 12, with hyphens separating them

  const regex = RegExp(
    "^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$"
  );
  const matchString = req.body.nonce.toString();

  if (!regex.test(matchString)) {
    console.log(
      `${generateDate()}`,
      "winston debug: Failed to generate captcha; nonce does not match format of 8-4-4-4-12 alphanumeric characters."
    );
    return res.status(400).send({ reason: "Incorrect nonce format" });
  }

  //otherwise return captcha payload
  const captcha = await generateCaptcha();

  if (!captcha || (captcha && !captcha.data)) {
    // Something bad happened with Captcha.
    console.log(
      `${generateDate()}`,
      "winston debug: Failed to generate captcha; svgCaptcha action failed."
    );
    return res.status(500).send({ reason: "Failed to generate captcha, please try again" });
  }

  let jwt;

  try {
    jwt = await encryptJWE(req.body.nonce, captcha);
  } catch (error) {
    console.log(
      `${generateDate()}`,
      "winston error: Failed to encrypt JWE: ",
      JSON.stringify(error)
    );
    return res.status(500).send({ reason: "Failed to generate captcha, please try again" });
  }

  const payload = {
    nonce: req.body.nonce,
    captcha: captcha.data,
    validation: jwt,
  };

  return res.status(200).send(payload);
});

app.post("/verify/captcha", function (req, res) {
  let response = {};
  return res.status(200).send(response);
});

app.get("/", (req, res) => {
  return res.status(200).send("Hello world");
});

app.listen(SERVICE_PORT);
