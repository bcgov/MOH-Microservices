import * as env from "./env.js";
import * as svgCaptcha from "svg-captcha";
import jwt from "jsonwebtoken";
import * as winston from "winston";
const { combine, timestamp, align, printf } = winston.format;
import pkg from "node-jose";
const { JWE, JWK } = pkg;

export const winstonLogger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS A", // eg. 2022-01-25 03:23:10.350 PM
    }),
    align(), //aligns logs in console
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`) //puts timestamp first in log
  ),
  transports: [new winston.transports.Console()],
});

export const verifyPrivateKey = (privateKey) => {
  //this function throws an error if the private key is incorrectly formatted
  //this way if there's a problem, the service will crash in OpenShift right away
  //rather than cause weird bugs later

  //Private Key must be parseable JSON
  try {
    JSON.parse(privateKey);
  } catch (error) {
    winstonLogger.error(`Failed to parse PRIVATE_KEY: ${JSON.stringify(error)}`);
    throw Error(`PRIVATE_KEY invalid (must be valid JSON, received ${privateKey})`);
  }

  let parsedKey = JSON.parse(privateKey);

  //Private Key must contain typical JSON Web Key (JWK) properties
  if (!Object.prototype.hasOwnProperty.call(parsedKey, "kty")) {
    throw Error(`PRIVATE_KEY isn't a valid JWK (missing "kty" property, received ${privateKey})`);
  }

  if (!Object.prototype.hasOwnProperty.call(parsedKey, "use")) {
    throw Error(`PRIVATE_KEY isn't a valid JWK (missing "use" property, received ${privateKey})`);
  }

  if (!Object.prototype.hasOwnProperty.call(parsedKey, "alg")) {
    throw Error(`PRIVATE_KEY isn't a valid JWK (missing "alg" property, received ${privateKey})`);
  }

  if (!Object.prototype.hasOwnProperty.call(parsedKey, "k")) {
    throw Error(`PRIVATE_KEY isn't a valid JWK (missing "k" property, received ${privateKey})`);
  }

  //This microservice uses symmetrical encryption.
  //If the JWK is designed for asymmetric encryption or signing, we shouldn't use it
  if (parsedKey.kty !== "oct") {
    throw Error(
      `Please check your PRIVATE_KEY and try again ("kty" needs to equal "oct" for symmetrical encryption. Received ${privateKey})`
    );
  }

  if (parsedKey.use !== "enc") {
    throw Error(
      `Please check your PRIVATE_KEY and try again (This microservice uses symmetrical encryption, which means "use" needs to equal "enc". Received ${privateKey})`
    );
  }
};

/**
 * @param {string|number} nonce
 * @return {boolean}
 */
export const verifyIncomingNonce = (nonce) => {
  //regex for nonce
  //alphanumeric characters in groups of 8, 4, 4, 4, and 12, with hyphens separating them
  //eg. a1234567-b123-c123-d123-e12345678901

  const regex = RegExp(
    "^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$"
  );
  const matchString = nonce.toString();

  return regex.test(matchString);
};

export const generateCaptcha = async () => {
  const captcha = svgCaptcha.create({
    size: 6, // size of random string
    ignoreChars: "0oO1iIl", // filter out some characters like 0o1i
    noise: 2, // number of lines to insert for noise
  });

  winstonLogger.debug(`winston debug: captcha generated: ${captcha.text}`);

  return captcha;
};

/**
 * @param {string} nonce
 * @param {string} secret
 * @param {string|number} expiry
 * @return {object}
 */
export const signObject = async (nonce, secret, expiry) => {
  const token = jwt.sign(
    {
      data: {
        nonce: nonce,
      },
    },
    secret,
    {
      expiresIn: expiry + "m",
    }
  );
  return {
    valid: true,
    jwt: token,
  };
};

/**
 * @param {string|number} nonce
 * @param {object} captcha
 * @return {object}
 */
export const encryptJWE = async (nonce, captcha) => {
  const body = {
    nonce,
    answer: captcha.text,
    expiry: Date.now() + env.CAPTCHA_SIGN_EXPIRY * 60000,
  };

  winstonLogger.debug(`to encrypt ${JSON.stringify(body)}`);

  let buff = Buffer.from(JSON.stringify(body));
  try {
    let result = await JWE.createEncrypt(JSON.parse(env.PRIVATE_KEY)).update(buff).final();
    winstonLogger.debug(`encrypted ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    winstonLogger.error(`Failed to encrypt JWE: ${JSON.stringify(error)}`);
    throw error;
  }
};

/**
 * @param {object} body
 * @param {object} private_key
 * @return {object}
 */
export const decryptJWE = async (body, private_key) => {
  winstonLogger.debug(`to decrypt: ${JSON.stringify(body)}`);
  try {
    let res = await JWK.asKey(private_key, "json");
    let decrypted = await JWE.createDecrypt(res).decrypt(body);
    var decryptedObject = JSON.parse(decrypted.plaintext.toString("utf8"));
    winstonLogger.debug(`decrypted object: ${JSON.stringify(decryptedObject)}`);
    return decryptedObject;
  } catch (error) {
    winstonLogger.error(`Failed to decrypt JWE: ${JSON.stringify(error)}`);
    throw error;
  }
};

/**
 * @param {object} input
 * @return {boolean}
 */
export const verifyIsJWE = (input) => {
  if (typeof input !== "object") {
    winstonLogger.debug(
      `Can't parse incoming JWE. Not an Object. Received ${JSON.stringify(input)}`
    );
    return false;
  }

  //Should have JWE properties
  if (!Object.prototype.hasOwnProperty.call(input, "protected")) {
    winstonLogger.debug(
      `Can't parse incoming JWE. Missing "protected" property. Received: ${JSON.stringify(input)}`
    );
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(input, "iv")) {
    winstonLogger.debug(
      `Can't parse incoming JWE. Missing "iv" property. Received: ${JSON.stringify(input)}`
    );
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(input, "ciphertext")) {
    winstonLogger.debug(
      `Can't parse incoming JWE. Missing "ciphertext" property. Received: ${JSON.stringify(input)}`
    );
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(input, "tag")) {
    winstonLogger.debug(
      `Can't parse incoming JWE. Missing "tag" property. Received: ${JSON.stringify(input)}`
    );
    return false;
  }

  return true;
};
