import {
  tryServer,
  generateServiceCommand,
  generatePortNumber,
  startMockLogger,
  startMockApi,
  startLocalServiceWith,
  testBody,
  VALID_SECRET,
  VALID_UUID,
  VALID_NOUN,
  validToken,
} from "./test-helpers.js";
import { it } from "vitest";

describe("Happy paths", () => {
  let mockLoggerPort;
  let mockApiPort;

  let mockLoggerUrl;
  let mockApiUrl;

  beforeAll(async () => {
    mockLoggerPort = generatePortNumber();
    mockApiPort = generatePortNumber();

    mockLoggerUrl = `http://localhost:${mockLoggerPort}`;
    mockApiUrl = `http://localhost:${mockApiPort}`;

    await startMockLogger(mockLoggerPort);
    await startMockApi(mockApiPort);
    await tryServer(mockLoggerUrl, "HEAD");
    await tryServer(mockApiUrl, "HEAD");
  });

  it("(Service) Should respond with a 200 to the /hello endpoint", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
    });
    await startLocalServiceWith(command);
    const url = `http://localhost:${port}/hello`;
    await tryServer(url, "HEAD");
    const response = await fetch(url, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });

  it("(Service) Should respond with a 200 to the /health endpoint", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
    });
    await startLocalServiceWith(command);
    const url = `http://localhost:${port}/health`;
    await tryServer(url, "HEAD");
    const response = await fetch(url, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });

  it("(Service) Should respond with a 200 to the /status endpoint", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
    });
    await startLocalServiceWith(command);
    const url = `http://localhost:${port}/status`;
    await tryServer(url, "HEAD");
    const response = await fetch(url, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });

  it("(Service) Happy path-- Responds with a 200 when conditions are met", async () => {
    //USE_AUTH_TOKEN needs to be true
    //AUTH_TOKEN_KEY needs to have length > 0
    //Request needs to include an X-Auth header containing a valid JWT
    //JWT has a nonce in its data
    //JWT was signed with the same AUTH_TOKEN_KEY used to initialize the msp-service
    //Incoming request URL is on the list of approved "nouns"/resource IDs
    //URL contains a uuid unless skipped
    //resource ID and nonce match unless skipped
    //If all these things are correct, request will respond with a 200

    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const testUrl = `http://localhost:${port}/${VALID_NOUN}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(200);
  });

  //this test works locally, but breaks in the Github workflow for some reason, so it's skipped for now
  it("(Service) Happy path-- Responds with a 200 when USE_AUTH_TOKEN is false and missing X-Auth header", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: false,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    // commented out X-Auth token for this particular test
    // headers.append("X-Authorization", `Bearer ${validToken}`);

    const testUrl = `http://localhost:${port}/${VALID_NOUN}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(200);
  });

  //this test works locally, but breaks in the Github workflow for some reason, so it's skipped for now
  it("(Service) Happy path-- Responds with a 200 when AUTH_TOKEN_KEY is empty/falsy and missing X-Auth header", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: "",
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    // commented out X-Auth token for this particular test
    // headers.append("X-Authorization", `Bearer ${validToken}`);

    const testUrl = `http://localhost:${port}/${VALID_NOUN}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(200);
  });
});
