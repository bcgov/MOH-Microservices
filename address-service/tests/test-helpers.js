import { exec } from "node:child_process";

//to help ensure local servers are online before running integration tests
export const tryServer = async (website, HTTPMethod) => {
  const retryAttempts = 10;

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
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return new Promise((reject) => {
    reject(
      `Couldn't reach ${website} (tried ${retryAttempts} times and gave up)`
    );
  });
};

export const startMockApi = async (dynamicPort) => {
  const dynamicPortEnv = dynamicPort ? `MOCK_API_PORT=${dynamicPort}` : "";
  const command = `${dynamicPortEnv} timeout 10s node bin/mock-api.js`;
  exec(
    command,
    // eslint-disable-next-line no-unused-vars
    (err, stdout, stderr) => {}
  );
};

export const startLocalServiceWith = async (command) => {
  console.log("local server started with: ", command);
  await exec(command, (err, stdout, stderr) => {
    if (err || stderr) {
      // console.log("service failed to start. error: ", err, stderr);
      // console.log("output: ", stdout);
    }
  });
};

export const generateServiceCommand = (override) => {
  if ((override && typeof override !== "object") || Array.isArray(override)) {
    throw new Error(
      "The generateLogCommand() function needs to be passed an object!"
    );
  }

  const options = {
    ADDRESS_VALIDATOR_URL: "",
    PORT: "8080",
    timeout: "5s",
  };

  Object.assign(options, override);

  return `ADDRESS_VALIDATOR_URL=${options.ADDRESS_VALIDATOR_URL} PORT=${options.PORT} timeout ${options.timeout} node src/index.js server`;
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
      console.log(
        `port number ${provisionalPort} already in use, regenerating...`
      );
    } else {
      usedPorts.push(provisionalPort);
      // console.log("provisional port: ", provisionalPort)
      // console.log("everything used so far:", usedPorts)
      return provisionalPort;
    }
  }

  throw new Error(
    "Couldn't generate a unique port number (tried 10 times and gave up)"
  );
};

export const jsonFormattedResponse = {
  Address: [
    {
      Organization: "",
      Contact: "",
      Building: "",
      SubBuilding: "",
      Street: "FAKE ST",
      HouseNumber: "111",
      DeliveryService: "",
      Locality: "FAKEVILLE",
      PostalCode: "V1A 1A1",
      Province: "BC",
      Country: "CANADA",
      Residue: "",
      DeliveryAddressLines: "111 FAKE ST",
      AddressLines: ["111 FAKE ST"],
      AddressComplete: "111 FAKE ST FAKEVILLE BC V1A 1A1",
    },
    {
      Organization: "",
      Contact: "",
      Building: "",
      SubBuilding: "",
      Street: "FAKE ST",
      HouseNumber: "222",
      DeliveryService: "",
      Locality: "FAKEVILLE",
      PostalCode: "V1A 1A1",
      Province: "BC",
      Country: "CANADA",
      Residue: "",
      DeliveryAddressLines: "222 FAKE ST",
      AddressLines: ["222 FAKE ST"],
      AddressComplete: "222 FAKE ST FAKEVILLE BC V1A 1A1",
    },
    {
      Organization: "",
      Contact: "",
      Building: "",
      SubBuilding: "",
      Street: "FAKE ST",
      HouseNumber: "333",
      DeliveryService: "",
      Locality: "FAKEVILLE",
      PostalCode: "V1A 1A1",
      Province: "BC",
      Country: "CANADA",
      Residue: "",
      DeliveryAddressLines: "333 FAKE ST",
      AddressLines: ["333 FAKE ST"],
      AddressComplete: "333 FAKE ST FAKEVILLE BC V1A 1A1",
    },
  ],
};
