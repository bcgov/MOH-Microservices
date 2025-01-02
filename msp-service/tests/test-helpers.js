//to help ensure local servers are online before running integration tests
export const tryServer = async (website, HTTPMethod) => {
  const retryAttempts = 10;

  for (let i = 0; i < retryAttempts; i++) {
    try {
      await fetch(website, {
        method: HTTPMethod,
      });
      // console.log(`successfully reached ${website}!`);
      return new Promise((resolve, reject) => {
        resolve();
      });
    } catch (error) {
      // console.log(`failed to reach ${website}, attempt `, i);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return new Promise((resolve, reject) => {
    reject(
      `Couldn't reach ${website} (tried ${retryAttempts} times and gave up)`
    );
  });
};

export const generateServiceCommand = (override) => {
  if ((override && typeof override !== "object") || Array.isArray(override)) {
    throw new Error(
      "The generateLogCommand() function needs to be passed an object!"
    );
  }

  const options = {
    LOGGER_HOST: "localhost",
    LOGGER_PORT: 3000,
    HOSTNAME: "asdf",
    TARGET_URL: "http://localhost:3001",
    USE_AUTH_TOKEN: true,
    AUTH_TOKEN_KEY: "aaa",
    timeout: "30s",
  };

  Object.assign(options, override);

  return `PORT=${options.PORT} HOSTNAME=${options.HOSTNAME} TARGET_URL=${options.TARGET_URL} AUTH_TOKEN_KEY=${options.AUTH_TOKEN_KEY} USE_AUTH_TOKEN=${options.USE_AUTH_TOKEN} LOGGER_HOST=${options.LOGGER_HOST} LOGGER_PORT=${options.LOGGER_PORT} timeout ${options.timeout} node src/index.js server`;

  //full version for when I'm ready for it:
  // return `LOG_LEVEL=${options.LOG_LEVEL} PORT=${options.PORT} TARGET_URL=${options.TARGET_URL} TARGET_USERNAME_PASSWORD=${options.TARGET_USERNAME_PASSWORD} MUTUAL_TLS_PEM_KEY_BASE64=${options.MUTUAL_TLS_PEM_KEY_BASE64} MUTUAL_TLS_PEM_KEY_PASSPHRASE=${options.MUTUAL_TLS_PEM_KEY_PASSPHRASE} MUTUAL_TLS_PEM_CERT=${options.MUTUAL_TLS_PEM_CERT} SECURE_MODE=${options.SECURE_MODE} USE_MUTUAL_TLS=${options.USE_MUTUAL_TLS} AUTH_TOKEN_KEY=${options.AUTH_TOKEN_KEY} USE_AUTH_TOKEN=${options.USE_AUTH_TOKEN} LOGGER_HOST=${options.LOGGER_HOST} LOGGER_PORT=${options.LOGGER_PORT} SPLUNK_AUTH_TOKEN=${options.SPLUNK_AUTH_TOKEN} timeout ${options.timeout} node src/index.js server`;
};

export const generatePortNumber = () => {
  //IANA officially recommends 49152-65535 for ephemeral ports
  const min = Math.ceil(49152);
  const max = Math.floor(65535);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
