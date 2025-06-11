//this is a test key for development purposes. Don't use in production
export const defaultPrivateKey = `{
  "kty": "oct",
  "kid": "gBdaS-G8RLax2qObTD94w",
  "use": "enc",
  "alg": "A256GCM",
  "k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"
}`;

//Environment variables passed down in OpenShift
export const SERVICE_PORT = process.env.SERVICE_PORT || 3000;
export const PRIVATE_KEY = process.env.PRIVATE_KEY || defaultPrivateKey;
export const SECRET = process.env.SECRET || "defaultSecret";
export const BYPASS_ANSWER = process.env.BYPASS_ANSWER;
export const JWT_SIGN_EXPIRY = process.env.JWT_SIGN_EXPIRY || "30";
export const LOG_LEVEL = process.env.LOG_LEVEL || "debug";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const RATE_LIMIT = process.env.RATE_LIMIT || 25;
export const AUDIO_RATE_LIMIT = process.env.AUDIO_RATE_LIMIT || 5; //if it's too low, unit tests will fail

//hardcoded for simplicity, but could be changed to process.env variables later if needed
export const CAPTCHA_SIGN_EXPIRY = "30";
