import {
  tryServer,
  generateServiceCommand,
  generatePortNumber,
  startMockLogger,
  startMockApi,
  startLocalServiceWith,
  testBody,
  VALID_SECRET,
  INVALID_SECRET,
  VALID_UUID,
  VALID_NOUN,
  validToken,
} from "./test-helpers.js";
import * as jwt from "jsonwebtoken";

describe("Mocks", () => {
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

  it("(MSW mock) Should properly intercept mockAPI calls", async () => {
    const response = await fetch(mockApiUrl, {
      method: "GET",
    });
    expect(response.status).toBe(200);
  });

  it("(MSW mock) Should properly intercept mockLogger calls", async () => {
    const response = await fetch(mockLoggerUrl, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });
});

describe("Service paths", () => {
  let mockLoggerPort;
  let mockApiPort;

  let mockLoggerUrl;
  let mockApiUrl;

  let defaultPort;

  beforeAll(async () => {
    mockLoggerPort = generatePortNumber();
    mockApiPort = generatePortNumber();

    mockLoggerUrl = `http://localhost:${mockLoggerPort}`;
    mockApiUrl = `http://localhost:${mockApiPort}`;

    await startMockLogger(mockLoggerPort);
    await startMockApi(mockApiPort);
    await tryServer(mockLoggerUrl, "HEAD");
    await tryServer(mockApiUrl, "HEAD");

    //start up default server
    defaultPort = generatePortNumber();
    const defaultCommand = generateServiceCommand({
      PORT: defaultPort,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
    });

    await startLocalServiceWith(defaultCommand);
    const defaultServerUrl = `http://localhost:${defaultPort}/`;
    await tryServer(defaultServerUrl, "HEAD");
  });

  it("(Service) Responds with a 401 when X-Authorization header is missing", async () => {
    const headers = new Headers();
    // commented out X-Auth token for this particular test
    // headers.append("X-Authorization", `Bearer ${validToken}`);

    const testUrl = `http://localhost:${defaultPort}/${VALID_NOUN}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(401);
  });

  it("(Service) Responds with a 401 when JWT does not contain a nonce property", async () => {
    const nonNonceToken = jwt.sign(
      {
        data: {
          foobar: VALID_UUID,
        },
      },
      VALID_SECRET,
      {
        expiresIn: "30m",
      }
    );

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${nonNonceToken}`);

    const testUrl = `http://localhost:${defaultPort}/${VALID_NOUN}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(401);
  });

  it("(Service) Responds with a 401 when JWT is signed with invalid secret", async () => {
    //here "invalid secret" means "secret that doesn't match the AUTH_TOKEN_KEY in the msp-service command"
    const wrongSecretToken = jwt.sign(
      {
        data: {
          nonce: VALID_UUID,
        },
      },
      INVALID_SECRET,
      {
        expiresIn: "30m",
      }
    );

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${wrongSecretToken}`);

    const testUrl = `http://localhost:${defaultPort}/${VALID_NOUN}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(401);
  });

  it("(Service) Responds with a 401 when URL isn't on the approved noun list", async () => {
    const port = generatePortNumber();
    const testNoun = "foobar";

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false}}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const invalidNoun = "fizzbuzz";
    const testUrl = `http://localhost:${port}/${invalidNoun}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(401);
  });

  it("(Service) Responds with a 200 when URL noun matches noun list in env", async () => {
    const port = generatePortNumber();
    const testNoun = "foobar";

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false, "skipUuidNonceMatchCheck": false}}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const testUrl = `http://localhost:${port}/${testNoun}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(200);
  });

  it("(Service) Responds with a 401 when the URL doesn't have a UUID", async () => {
    const port = generatePortNumber();
    const testNoun = "foobar";

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false}}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const absentUuid = "";

    const testUrl = `http://localhost:${port}/${testNoun}/${absentUuid}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(401);
  });

  it("(Service) Responds with a 200 when the URL doesn't have a UUID but skip is true", async () => {
    const port = generatePortNumber();
    const testNoun = "foobar";

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": true}}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const absentUuid = "";

    const testUrl = `http://localhost:${port}/${testNoun}/${absentUuid}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(200);
  });

  it("(Service) Responds with a 401 when the URL uuid doesn't match the JWT nonce and NOUN_JSON prohibits skip", async () => {
    const port = generatePortNumber();
    const testNoun = "foobar";

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false, "skipUuidNonceMatchCheck": false}}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const invalidUuid = "aaaaaaaa-e89b-12d3-a456-426655440000";

    const testUrl = `http://localhost:${port}/${testNoun}/${invalidUuid}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(401);
  });

  it("(Service) Responds with a 200 when the URL uuid doesn't match the JWT nonce and NOUN_JSON authorizes skip", async () => {
    const port = generatePortNumber();
    const testNoun = "foobar";

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false, "skipUuidNonceMatchCheck": true}}`,
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const invalidUuid = "aaabbbcc-e89b-12d3-a456-426655440000";

    const testUrl = `http://localhost:${port}/${testNoun}/${invalidUuid}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(200);
  });
});
