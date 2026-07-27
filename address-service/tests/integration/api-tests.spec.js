import {
  tryServer,
  generateServiceCommand,
  generatePortNumber,
  startLocalServiceWith,
  startMockApi,
  jsonFormattedResponse,
} from "../test-helpers.js";
import { testXML } from "../../bin/testXML.js"

describe("Mock Service-- status, health checks", async () => {
  const mockServiceUrl = "http://localhost:8080";

  beforeAll(async () => {
    const command = generateServiceCommand({
      ADDRESS_VALIDATOR_URL: "",
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
