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

describe("General rate limiting", async () => {
  const RATE_LIMIT = 10;
  let mockLoggerPort;
  let mockApiPort;

  let mockLoggerUrl;
  let mockApiUrl;

  let ephemeralServerUrl;

  const headers = new Headers();
  headers.append("X-Authorization", `Bearer ${validToken}`);

  beforeAll(async () => {
    mockLoggerPort = generatePortNumber();
    mockApiPort = generatePortNumber();

    mockLoggerUrl = `http://localhost:${mockLoggerPort}`;
    mockApiUrl = `http://localhost:${mockApiPort}`;

    await startMockLogger(mockLoggerPort);
    await startMockApi(mockApiPort);
    await tryServer(mockLoggerUrl, "HEAD");
    await tryServer(mockApiUrl, "HEAD");
  }, 30000);

  beforeEach(async () => {
    const port = generatePortNumber();
    const command = generateServiceCommand({
      PORT: port,
      USE_AUTH_TOKEN: true,
      AUTH_TOKEN_KEY: VALID_SECRET,
      LOGGER_HOST: "localhost",
      LOGGER_PORT: mockLoggerPort,
      HOSTNAME: "asdf",
      TARGET_URL: `http://localhost:${mockApiPort}`,
      RATE_LIMIT,
    });
    await startLocalServiceWith(command);
    // console.log("command started with: ", command);
    ephemeralServerUrl = `http://localhost:${port}`;
    await tryServer(ephemeralServerUrl, "HEAD");
  }, 30000);

  it("the /status endpoint should respond with a 429 after RATE_LIMIT is reached", async () => {
    //reach the API limit
    for (let i = 1; i < RATE_LIMIT; i++) {
      const response = await fetch(`${ephemeralServerUrl}/status`, {
        method: "GET",
        headers,
      });

      expect(response.status).toBe(200);
    }

    //now that the limit has been reached, any subsequent API calls should respond with a 429
    const response = await fetch(`${ephemeralServerUrl}/status`, {
      method: "GET",
      headers,
    });
    expect(response.status).toBe(429);
  });

  it("the /hello endpoint should respond with a 429 after RATE_LIMIT is reached", async () => {
    //reach the API limit
    for (let i = 1; i < RATE_LIMIT; i++) {
      const response = await fetch(`${ephemeralServerUrl}/hello`, {
        method: "GET",
        headers,
      });

      expect(response.status).toBe(200);
    }

    //now that the limit has been reached, any subsequent API calls should respond with a 429
    const response = await fetch(`${ephemeralServerUrl}/hello`, {
      method: "GET",
      headers,
    });
    expect(response.status).toBe(429);
  });

  it("the /health endpoint should respond with a 429 after RATE_LIMIT is reached", async () => {
    //reach the API limit
    for (let i = 1; i < RATE_LIMIT; i++) {
      const response = await fetch(`${ephemeralServerUrl}/health`, {
        method: "GET",
        headers,
      });

      expect(response.status).toBe(200);
    }

    //now that the limit has been reached, any subsequent API calls should respond with a 429
    const response = await fetch(`${ephemeralServerUrl}/health`, {
      method: "GET",
      headers,
    });
    expect(response.status).toBe(429);
  });

  it("the / endpoint should respond with a 429 after RATE_LIMIT is reached", async () => {
    //reach the API limit
    for (let i = 1; i < RATE_LIMIT; i++) {
      const response = await fetch(`${ephemeralServerUrl}/${VALID_NOUN}/${VALID_UUID}`, {
        method: "POST",
        body: JSON.stringify(testBody),
        headers,
      });

      expect(response.status).toBe(200);
    }

    //now that the limit has been reached, any subsequent API calls should respond with a 429
    const response = await fetch(`${ephemeralServerUrl}/${VALID_NOUN}/${VALID_UUID}`, {
      method: "POST",
      body: JSON.stringify(testBody),
      headers,
    });
    expect(response.status).toBe(429);
  });
});
