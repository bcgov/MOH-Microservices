//Environment variables
export const SERVICE_PORT = process.env.SERVICE_PORT || 3000;
//this is a test key for development purposes. Don't use in production
export const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  `{
  "kty": "oct",
  "kid": "gBdaS-G8RLax2qObTD94w",
  "use": "enc",
  "alg": "A256GCM",
  "k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"
}`;
export const SECRET = process.env.SECRET || "defaultSecret";
export const BYPASS_ANSWER = process.env.BYPASS_ANSWER;
export const JWT_SIGN_EXPIRY = process.env.JWT_SIGN_EXPIRY || "30";
export const LOG_LEVEL = process.env.LOG_LEVEL || "debug";

//hardcoded for now, but could be changed to process.env variables later if needed
export const CAPTCHA_SIGN_EXPIRY = "30";
