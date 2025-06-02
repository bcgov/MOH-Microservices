import { exec } from "node:child_process";

export const tryServer = async (website, HTTPMethod) => {
  const retryAttempts = 6;

  for (let i = 0; i < retryAttempts; i++) {
    try {
      await fetch(website, {
        method: HTTPMethod,
      });
      // console.log(`successfully reached ${website}!`);
      return new Promise((resolve) => {
        resolve();
      });
    } catch (error) {
      // console.log(`failed to reach ${website}, attempt `, i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return new Promise((resolve, reject) => {
    reject(`Couldn't reach ${website} (tried ${retryAttempts} times and gave up)`);
  });
};

//List of used ports to decrease test flakiness
let usedPorts = [];

export const generatePortNumber = () => {
  //IANA officially recommends 49152-65535 for ephemeral ports
  const min = Math.ceil(49152);
  const max = Math.floor(65535);

  const numberOfRetries = 10;

  for (let i = 0; i < numberOfRetries; i++) {
    const provisionalPort = Math.floor(Math.random() * (max - min + 1)) + min;

    if (usedPorts.includes(provisionalPort)) {
      console.log(`port number ${provisionalPort} already in use, regenerating...`);
    } else {
      usedPorts.push(provisionalPort);
      return provisionalPort;
    }
  }

  throw new Error("Couldn't generate a unique port number (tried 10 times and gave up)");
};

export const generateServiceCommand = (override) => {
  if ((override && typeof override !== "object") || Array.isArray(override)) {
    throw new Error("The generateServiceCommand() function needs to be passed an object!");
  }

  const options = {
    SERVICE_PORT: 3000,
    CAPTCHA_SIGN_EXPIRY: 180,
    PRIVATE_KEY:
      '{"kty":"oct","kid":"gBdaS-G8RLax2qObTD94w","use":"enc","alg":"A256GCM","k":"FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"}',
    SECRET: "defaultSecret",
    BYPASS_ANSWER: "a1a1a1",
    JWT_SIGN_EXPIRY: "10",
    LOG_LEVEL: "debug",
    timeout: "5s",
  };

  Object.assign(options, override);

  return `SERVICE_PORT=${options.SERVICE_PORT} CAPTCHA_SIGN_EXPIRY=${options.CAPTCHA_SIGN_EXPIRY} PRIVATE_KEY='${options.PRIVATE_KEY}' SECRET=${options.SECRET} BYPASS_ANSWER=${options.BYPASS_ANSWER} JWT_SIGN_EXPIRY=${options.JWT_SIGN_EXPIRY} LOG_LEVEL=${options.LOG_LEVEL}  timeout ${options.timeout} node src/index.js server`;
};

export const startLocalServiceWith = async (command) => {
  await exec(command, (err) => {
    console.log("service failed to start: ", err);
  });
};
