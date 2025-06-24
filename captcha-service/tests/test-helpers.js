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

  //if the for loop runs out, the site must be offline
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
      // console.log(`port number ${provisionalPort} already in use, regenerating...`);
    } else {
      usedPorts.push(provisionalPort);
      return provisionalPort;
    }
  }

  throw new Error("Couldn't generate a unique port number (tried 10 times and gave up)");
};

export const generateServiceCommand = (override) => {
  //generates a command to run the server for unit/integration tests

  if ((override && typeof override !== "object") || Array.isArray(override)) {
    throw new Error("The generateServiceCommand() function needs to be passed an object!");
  }

  //default options
  const options = {
    SERVICE_PORT: 3000,
    CAPTCHA_SIGN_EXPIRY: 180,
    PRIVATE_KEY:
      '{"kty":"oct","kid":"gBdaS-G8RLax2qObTD94w","use":"enc","alg":"A256GCM","k":"FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"}',
    SECRET: "defaultSecret",
    BYPASS_ANSWER: "a1a1a1",
    JWT_SIGN_EXPIRY: "10",
    LOG_LEVEL: "debug",
    RATE_LIMIT: 25,
    AUDIO_RATE_LIMIT: 5,
    timeout: "5s",
  };

  //overrides the default options with whatever's passed down as an argument
  Object.assign(options, override);

  //returns a command that's ready to be run with `exec`
  return `SERVICE_PORT=${options.SERVICE_PORT} CAPTCHA_SIGN_EXPIRY=${options.CAPTCHA_SIGN_EXPIRY} PRIVATE_KEY='${options.PRIVATE_KEY}' SECRET=${options.SECRET} BYPASS_ANSWER=${options.BYPASS_ANSWER} JWT_SIGN_EXPIRY=${options.JWT_SIGN_EXPIRY} LOG_LEVEL=${options.LOG_LEVEL} RATE_LIMIT=${options.RATE_LIMIT} AUDIO_RATE_LIMIT=${options.AUDIO_RATE_LIMIT}  timeout ${options.timeout} node src/index.js server`;
};

export const startLocalServiceWith = async (command) => {
  await exec(command, (err) => {
    console.log("service failed to start: ", err);
  });
};
