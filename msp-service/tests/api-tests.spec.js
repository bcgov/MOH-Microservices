import {
  tryServer,
  generateServiceCommand,
  generatePortNumber,
} from "./test-helpers.js";
import { http, HttpResponse, bypass } from "msw";
import { setupServer } from "msw/node";
import { exec } from "child_process";
import * as jwt from "jsonwebtoken";
import { it } from "vitest";

const VALID_SECRET = "defaultSecret";
const INVALID_SECRET = "foobar";
const VALID_NOUN= "MSPDESubmitAttachment"
const VALID_UUID="123e4567-e89b-12d3-a456-426655440000"

//these need to match the values in start-local-service.sh
const mockLoggerUrl = "http://localhost:3000";
const mockApiUrl = "http://localhost:3001";

const validToken = jwt.sign(
  {
    data: {
      nonce: `${VALID_UUID}`,
    },
  },
  VALID_SECRET,
  {
    expiresIn: "30m",
  }
);

const testBody = { body: "xyz", logsource: "integration test request" };

const startLocalServiceWith = async (command) => {
  await exec(command, (err, stdout, stderr) => {
    console.log("service failed to start: ", err);
  });
};

//Mock Service Worker handlers-- let us mock out logger/API calls without running servers
export const handlers = [
  http.get(mockApiUrl, (request) => {
    return new HttpResponse(null, {
      status: 200,
      statusText: "OK",
    });
  }),
  http.get(mockLoggerUrl, (request) => {
    return new HttpResponse(null, {
      status: 200,
      statusText: "OK",
    });
  }),
];

const server = setupServer(...handlers);

describe("Service paths", () => {
  //Mock Service Worker requires server.listen, server.close, and server.resetHandlers
  // Start server before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

  //  Close server after all tests
  afterAll(() => server.close());

  // Reset handlers after each test--important for test isolation
  afterEach(() => server.resetHandlers());

  it("(MSW mock) Should properly intercept mockAPI calls", async () => {
    const response = await fetch(mockApiUrl, {
      method: "GET",
    });
    expect(response.status).toBe(200);
  });

  it("(MSW mock) Should properly intercept mockLogger calls", async () => {
    const response = await fetch(mockLoggerUrl, {
      method: "GET",
    });
    expect(response.status).toBe(200);
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
    //URL is on the list of approved "nouns"/resource IDs
    //resource ID and nonce match (if applicable)
    //If all these things are correct, request will respond with a 200

    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
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
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
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
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
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

  it("(Service) Responds with a 401 when X-Authorization header is missing", async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
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
    expect(response.status).toBe(401);
  });

  it("(Service) Responds with a 401 when JWT does not contain nonce", async () => {
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

    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${nonNonceToken}`);

    const testUrl = `http://localhost:${port}/${VALID_NOUN}/${VALID_UUID}`;

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

    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${wrongSecretToken}`);

    const testUrl = `http://localhost:${port}/${VALID_NOUN}/${VALID_UUID}`;

    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(401);
  });

  it("(Service) Responds with a 401 when URL isn't on the approved noun list", async () => {
    const port = generatePortNumber();
    const testNoun = "foobar"

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false}}`
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const invalidNoun = "fizzbuzz"
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
    const testNoun = "foobar"

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false, "skipUuidNonceMatchCheck": false}}`
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
    const testNoun = "foobar"

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false}}`
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const absentUuid = ""

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
    const testNoun = "foobar"

    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": true}}`
    });

    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");

    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);

    const absentUuid = ""

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
    const testNoun = "foobar"
  
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false, "skipUuidNonceMatchCheck": false}}`
    });
  
    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");
  
    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);
  
    const invalidUuid = "aaaaaaaa-e89b-12d3-a456-426655440000"
  
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
    const testNoun = "foobar"
  
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: 3000,
      HOSTNAME: "asdf",
      TARGET_URL: "http://localhost:3001",
      NOUN_JSON: `{"${testNoun}": {"skipUuidCheck": false, "skipUuidNonceMatchCheck": true}}`
    });
  
    await startLocalServiceWith(command);
    const serverUrl = `http://localhost:${port}/`;
    await tryServer(serverUrl, "HEAD");
  
    const headers = new Headers();
    headers.append("X-Authorization", `Bearer ${validToken}`);
  
    const invalidUuid = "aaabbbcc-e89b-12d3-a456-426655440000"
  
    const testUrl = `http://localhost:${port}/${testNoun}/${invalidUuid}`;
  
    const response = await fetch(testUrl, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers: headers,
    });
    expect(response.status).toBe(200);
  });
});
