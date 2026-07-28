import {
  tryServer,
  generateServiceCommand,
  generatePortNumber,
  startLocalServiceWith,
  startMockApi,
} from "../test-helpers.js";
import {
  jsonFormattedResponse,
  jsonFormattedResponseRaw
} from "../test-constants.js";
import { testXML } from "../../bin/testXML.js"

describe("Mock Service smoke test", async () => {
  const mockServiceUrl = "http://localhost:8080";

  beforeAll(async () => {
    const command = generateServiceCommand({
      ADDRESS_VALIDATOR_URL: "fake-endpoint.com",
      PORT: 8080,
    });
    await startLocalServiceWith(command);
    await tryServer(mockServiceUrl, "HEAD");
  }, 30000);

  it("Should respond with a 200 to the / endpoint", async () => {
    const response = await fetch(`${mockServiceUrl}`, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });
});

describe("Status, health checks", async () => {
  const port = generatePortNumber();
  const mockServiceUrl = `http://localhost:${port}`;

  beforeAll(async () => {
    const command = generateServiceCommand({
      ADDRESS_VALIDATOR_URL: "fake-endpoint.com", //doesn't matter for these tests
      PORT: port,
      timeout: "10s",
    });
    await startLocalServiceWith(command);
    await tryServer(mockServiceUrl, "HEAD");
  }, 30000);

  it("Should respond with a 200 to the / endpoint", async () => {
    const response = await fetch(`${mockServiceUrl}`, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });

  it("Should respond with a 200 to the /hello endpoint", async () => {
    const response = await fetch(`${mockServiceUrl}/hello`, {
      method: "GET",
    });
    expect(response.status).toBe(200);
  });

  it("Should respond with a 200 to the /status endpoint", async () => {
    const response = await fetch(`${mockServiceUrl}/status`, {
      method: "GET",
    });
    expect(response.status).toBe(200);
  });
});

describe("/ip endpoint", async () => {
  const port = generatePortNumber();
  const mockServiceUrl = `http://localhost:${port}`;

  beforeAll(async () => {
    const command = generateServiceCommand({
      ADDRESS_VALIDATOR_URL: "fake-endpoint.com", //doesn't matter for these tests
      PORT: port,
      timeout: "10s",
    });
    await startLocalServiceWith(command);
    await tryServer(mockServiceUrl, "HEAD");
  }, 30000);

  it("Should respond with a 200 to the /ip endpoint", async () => {
    await fetch(`${mockServiceUrl}/ip`, {
      method: "GET",
    })
      .then(function (response) {
        expect(response.status).toBe(200);
        return response.json();
      })
      .then(function (data) {
        expect(data.ip).toBeTypeOf("string");
      });
  });
});

describe("/test endpoint", async () => {
  let mockApiPort;
  let mockApiUrl;
  beforeAll(async () => {
    mockApiPort = generatePortNumber();
    mockApiUrl = `http://localhost:${mockApiPort}`;
    await startMockApi(mockApiPort);
    await tryServer(mockApiUrl, "HEAD");
  });
  it("Should respond with a 200 to the /test endpoint and respond with raw address validator data", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      ADDRESS_VALIDATOR_URL: mockApiUrl,
      PORT: port,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/test`;
    await tryServer(serverUrl, "HEAD");
    await fetch(`${serverUrl}`, {
      method: "GET",
    })
      .then(function (response) {
        expect(response.status).toBe(200);
        return response.text();
      })
      .then(function (data) {
        expect(data).toEqual(testXML);
      });
  });
});

describe("/address endpoint", async () => {
  let mockApiPort;
  let mockApiUrl;
  beforeAll(async () => {
    mockApiPort = generatePortNumber();
    mockApiUrl = `http://localhost:${mockApiPort}`;
    await startMockApi(mockApiPort);
    await tryServer(mockApiUrl, "HEAD");
  });
  it("Should respond with a 200 to the /address endpoint and respond with JSON formatted address data", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      ADDRESS_VALIDATOR_URL: mockApiUrl,
      PORT: port,
    });

    const serverUrl = `http://localhost:${port}`;

    await startLocalServiceWith(command);
    await tryServer(serverUrl, "HEAD");
    await fetch(`${serverUrl}/address`, {
      method: "GET",
    })
      .then(function (response) {
        expect(response.status).toBe(200);
        return response.json();
      })
      .then(function (data) {
        expect(data).toEqual(jsonFormattedResponse);
      });
  });
});

describe("/address-raw endpoint", async () => {
  let mockApiPort;
  let mockApiUrl;
  beforeAll(async () => {
    mockApiPort = generatePortNumber();
    mockApiUrl = `http://localhost:${mockApiPort}`;
    await startMockApi(mockApiPort);
    await tryServer(mockApiUrl, "HEAD");
  });
  it("Should respond with a 200 to the /address-raw endpoint and respond with JSON formatted address data", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      ADDRESS_VALIDATOR_URL: mockApiUrl,
      PORT: port,
    });

    const serverUrl = `http://localhost:${port}`;

    await startLocalServiceWith(command);
    await tryServer(serverUrl, "HEAD");
    await fetch(`${serverUrl}/address-raw`, {
      method: "GET",
    })
      .then(function (response) {
        expect(response.status).toBe(200);
        return response.json();
      })
      .then(function (data) {
        console.log("raw data log: ", data)
        expect(data).toEqual(jsonFormattedResponseRaw);
      });
  });
});

// /zip is not used in any DE application, so it was skipped