import { tryServer } from "./test-helpers.js";

const { exec } = require("node:child_process");

//these need to match the values in start-local-service.sh
const mockLoggerUrl = "http://localhost:3000";
const mockApiUrl = "http://localhost:3001";
const localServiceUrl = "http://localhost:8080";

//create child process to run the services for the duration of the tests
//vitest doesn't always close child processes out when it finishes, so there's a timeout here to make extra sure they close

const startMockLogger = async () => {
  const childProcess = await exec(
    "timeout 45s node bin/mock-logger.js",
    (err, stdout, stderr) => {}
  );
};

const startMockApi = async () => {
  const childProcess = await exec(
    "timeout 45s node bin/mock-api.js",
    (err, stdout, stderr) => {}
  );
};

const startLocalService = async () => {
  const childProcess = await exec(
    "timeout 45s bin/start-local-service.sh --test",
    (err, stdout, stderr) => {}
  );
};

describe("test", () => {
  beforeAll(async () => {
    await startMockLogger();
    await startMockApi();
    await startLocalService();
    await tryServer(mockLoggerUrl, "HEAD");
    await tryServer(mockApiUrl, "HEAD");
    await tryServer(localServiceUrl, "GET");
  }, 30000);

  it("(Mock logger) Should respond with a 200 to the / endpoint", async () => {
    const response = await fetch(`${mockLoggerUrl}`, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });

  it("(Mock api) Should respond with a 200 to the / endpoint", async () => {
    const response = await fetch(`${mockApiUrl}`, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });

  it("(Mock service) Should respond with a 200 to the / endpoint", async () => {
    const response = await fetch(`${localServiceUrl}/hello`, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });
});