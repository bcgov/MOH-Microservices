import * as env from "./env.js";
import * as svgCaptcha from "svg-captcha";
import jwt from "jsonwebtoken";
import * as winston from "winston";
const { combine, timestamp, align, printf } = winston.format;
import pkg from "node-jose";
const { JWE, JWK } = pkg;
import * as lamejs from "@breezystack/lamejs";
import { spawnSync } from "node:child_process";
import pathToFfmpeg from "ffmpeg-static";

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

export const verifyPrivateKey = async (privateKey) => {
  //this function throws an error if the private key is incorrectly formatted
  //this way if there's a problem, the service will crash in OpenShift right away
  //rather than cause weird bugs later

  //Private Key must be parseable JSON
  try {
    JSON.parse(privateKey);
  } catch (error) {
    winstonLogger.error(`Failed to parse PRIVATE_KEY as JSON: ${JSON.stringify(error)}`);
    throw Error(`PRIVATE_KEY invalid (must be valid JSON, received ${privateKey})`);
  }

  let parsedKey = JSON.parse(privateKey);

  try {
    const result = await JWK.asKey(parsedKey);
    console.log("result in try: ", result);
  } catch (error) {
    winstonLogger.error(`Failed to parse PRIVATE_KEY as JWK: ${JSON.stringify(error)}`);
    throw Error(
      `PRIVATE_KEY invalid (node-jose must be able to parse it as a JWK, received ${privateKey})`
    );
  }

  if (!Object.prototype.hasOwnProperty.call(parsedKey, "alg")) {
    throw Error(`PRIVATE_KEY should have an alg property (received ${privateKey})`);
  }

  if (!Object.prototype.hasOwnProperty.call(parsedKey, "k")) {
    throw Error(`PRIVATE_KEY should have a k property (received ${privateKey})`);
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

  return true;
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

export const verifyJwtExpiry = (expiry) => {
  if (typeof expiry !== "string") {
    winstonLogger.error(`Invalid jwt expiry format. Received: ${expiry}`);
    throw Error(`Invalid jwt expiry format; must be string. Received: ${expiry}`);
  }

  if (isNaN(parseInt(expiry))) {
    winstonLogger.error(`Invalid jwt expiry format. Received: ${expiry}`);
    throw Error(`Invalid jwt expiry format; must be parseable to a number. Received: ${expiry}`);
  }

  return true;
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
  if (!nonce || !secret || !expiry) {
    return false;
  }
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
 * @param {string} privateKey
 * @param {string|number} expiry
 * @return {object}
 */
export const encryptJWE = async (nonce, captcha, privateKey, expiry) => {
  if (!nonce || !captcha || !captcha.text || !privateKey || !expiry) {
    winstonLogger.debug(
      `Missing expected arguments. Nonce: ${nonce}, Captcha: ${captcha}, Private key: ${privateKey}, Expiry: ${expiry}`
    );
    return false;
  }

  if (!verifyPrivateKey(privateKey)) {
    winstonLogger.debug(`Private key didn't pass verifyPrivateKey check. Received: ${privateKey}`);
    return false;
  }

  //try/catch block in case it throws an error
  try {
    if (!verifyJwtExpiry(expiry)) {
      winstonLogger.debug(`Invalid expiry format. Must be number. Received: ${expiry}`);
      return false;
    }
  } catch {
    winstonLogger.debug(`Invalid expiry format. Must be number. Received: ${expiry}`);
    return false;
  }

  const body = {
    nonce,
    answer: captcha.text,
    expiry: Date.now() + parseInt(expiry) * 60000, //the current time plus a number of minutes equal to expiry
  };

  winstonLogger.debug(`to encrypt ${JSON.stringify(body)}`);

  let buff = Buffer.from(JSON.stringify(body));
  try {
    let result = await JWE.createEncrypt(JSON.parse(privateKey)).update(buff).final();
    winstonLogger.debug(`encrypted ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    winstonLogger.error(`Failed to encrypt JWE: ${JSON.stringify(error)}`);
    throw error;
  }
};

/**
 * @param {object} body
 * @param {object} privateKey
 * @return {object}
 */
export const decryptJWE = async (body, privateKey) => {
  if (!body || !privateKey) {
    winstonLogger.debug(`Missing expected arguments. Body: ${body}, Private key: ${privateKey}`);
    return false;
  }

  winstonLogger.debug(`to decrypt: ${JSON.stringify(body)}`);
  try {
    let res = await JWK.asKey(privateKey, "json");
    let decrypted = await JWE.createDecrypt(res).decrypt(body);
    const decryptedObject = JSON.parse(decrypted.plaintext.toString("utf8"));
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
  //Should be an object
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

export const convertWavToMp3 = async (wav) => {
  if (!wav) {
    winstonLogger.debug(`convertWavToMp3 failed; no wav provided. Received: ${wav}`);
    return false;
  }

  const uintToArrayBuffer = (array) => {
    return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
  };

  // const arrayBuffer = this.result;
  const arrayBuffer = uintToArrayBuffer(wav);

  // Create a WAV decoder
  const wavDecoder = lamejs.WavHeader.readHeader(new DataView(arrayBuffer));

  // Get the WAV audio data as an array of samples
  const wavSamples = new Int16Array(arrayBuffer, wavDecoder.dataOffset, wavDecoder.dataLen / 2);

  // Create an MP3 encoder
  const mp3Encoder = new lamejs.Mp3Encoder(wavDecoder.channels, wavDecoder.sampleRate, 128);

  // Encode the WAV samples to MP3
  const mp3Buffer = mp3Encoder.encodeBuffer(wavSamples);

  // Finalize the MP3 encoding
  const mp3Data = mp3Encoder.flush();

  // Combine the MP3 header and data into a new ArrayBuffer
  const mp3BufferWithHeader = new Uint8Array(mp3Buffer.length + mp3Data.length);
  mp3BufferWithHeader.set(mp3Buffer, 0);
  mp3BufferWithHeader.set(mp3Data, mp3Buffer.length);

  const verification = await verifyMp3Integrity(mp3BufferWithHeader);

  return new Promise((resolve, reject) => {
    if (!verification) {
      reject(false);
    } else {
      resolve(mp3BufferWithHeader);
    }
  });
};

/**
 * @param {string} input
 * @return {string}
 */
export const getSpacedAnswer = (answer) => {
  if (typeof answer !== "string") {
    return answer;
  }

  let result = "";
  for (let i = 0; i < answer.length; i++) {
    result += answer[i];
    //changing the punctuation changes how the captcha sounds
    //alternatives include : and ,
    result += "; ";
  }
  return result.toString();
};

/**
 * @param {mp3} src
 * @return {boolean}
 */
export const verifyMp3Integrity = async (src) => {
  if (!src) {
    return false;
  }

  //This script is going to try to verify the mp3 by processing it through ffmpeg
  //The goal is for there to be no errors
  //but if there are, the purpose of this script is to handle that situation gracefully

  return new Promise((resolve, reject) => {
    try {
      //as a default, we assume there are errors until proven otherwise
      let checkFfmpegErrors = { status: true };

      //-xerror means the script will stop when it encounters the first error, which we want
      //-i pipe:0 means the input gets piped in rather than passed as an argument, which prevents errors
      checkFfmpegErrors = spawnSync(pathToFfmpeg, ["-xerror", "-i", "pipe:0", "-f", "null", "-"], {
        encoding: "utf-8",
        input: src,
      });

      //if no errors are present, resolve the verification check as true
      //in other words, verification worked, input is an mp3
      if (!checkFfmpegErrors.status) {
        resolve(true);
      } else {
        //otherwise resolve false-- the script successfully verified that the input is not an mp3
        resolve(false);
      }
    } catch (error) {
      //The script failed to verify the input for some reason
      reject(`Mp3 verification error: ${error}`);
    }
  });
};
