// import * as fs from "fs";
import { exec } from "node:child_process";

//to help ensure local servers are online before running integration tests
export const tryServer = async (website, HTTPMethod) => {
  const retryAttempts = 10;

  for (let i = 0; i < retryAttempts; i++) {
    try {
      await fetch(website, {
        method: HTTPMethod,
      });
      console.log(`successfully reached ${website}!`);
      return new Promise((resolve) => {
        resolve();
      });
    } catch (error) {
      console.log(`failed to reach ${website}, attempt `, i);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return new Promise((reject) => {
    reject(`Couldn't reach ${website} (tried ${retryAttempts} times and gave up)`);
  });
};

export const generatePortNumber = () => {
  //IANA officially recommends 49152-65535 for ephemeral ports.
  const min = Math.ceil(49152);
  const max = Math.floor(65535);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateLogCommand = (override) => {
  if ((override && typeof override !== "object") || Array.isArray(override)) {
    throw new Error(
      "The generateLogCommand() function needs to be passed an object!"
    );
  }
  const options = {
    SERVICE_PORT: "8080",
    SPA_ENV_ABCD_MAINTENANCE_FLAG: true,
    SPA_ENV_ABCD_MAINTENANCE_START: "2025-02-01 07:00:00 AM",
    SPA_ENV_ABCD_MAINTENANCE_END: "2025-02-01 11:00:00 PM",
    timeout: "5s",
  };

  Object.assign(options, override);

  return `SERVICE_PORT=${options.SERVICE_PORT} SPA_ENV_ABCD_MAINTENANCE_FLAG=${options.SPA_ENV_ABCD_MAINTENANCE_FLAG} SPA_ENV_ABCD_MAINTENANCE_START='${options.SPA_ENV_ABCD_MAINTENANCE_START}' SPA_ENV_ABCD_MAINTENANCE_END='${options.SPA_ENV_ABCD_MAINTENANCE_END}' timeout ${options.timeout} node src/index.js server`;
};

export const startLocalServiceWith = async (command) => {
  exec(command, () => {
    ///err, stdout, stderr
  });
};

// export const doesPathExist = async (path) => {
//   try {
//     fs.accessSync(path);
//     // console.log(`${path} exists`);
//     return true;
//   } catch (error) {
//     // console.log(`${path} does not exist (could not reach)`)
//     return false;
//   }
// };
