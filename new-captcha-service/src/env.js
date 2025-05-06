//Environment variables
export const SERVICE_PORT = process.env.SERVICE_PORT || 3000;
export const CAPTCHA_SIGN_EXPIRY = 180;
//this is a test key for development purposes. Don't use in production
export const PRIVATE_KEY = `{
  "kty": "oct",
  "kid": "gBdaS-G8RLax2qObTD94w",
  "use": "enc",
  "alg": "A256GCM",
  "k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"
}`;
export const SECRET = "defaultSecret";
export const BYPASS_ANSWER = process.env.BYPASS_ANSWER;
export const JWT_SIGN_EXPIRY = "10";
export const LOG_LEVEL = "debug";
