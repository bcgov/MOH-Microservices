import { tryServer, startMockLogger, startMockApi, startLocalService } from "./test-helpers.js";

//these need to match the values in start-local-service.sh
const mockLoggerUrl = "http://localhost:3000";
const mockApiUrl = "http://localhost:3001";
const localServiceUrl = "http://localhost:8080";

describe("Mock service boot-up in local environment", () => {
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
