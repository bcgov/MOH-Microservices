import {
  tryServer,
  generatePortNumber,
  generateLogCommand,
  startLocalServiceWith,
} from "../test-helpers.js";

describe("Start local servers, test APIs", async () => {
  const port = generatePortNumber();
  const localServiceUrl = `http://localhost:${port}`;

  beforeAll(async () => {
    const command = generateLogCommand({
      SERVICE_PORT: port,
      SPA_ENV_ABCD_MAINTENANCE_FLAG: true,
      SPA_ENV_ABCD_MAINTENANCE_START: "2025-02-01 07:00:00 AM",
      SPA_ENV_ABCD_MAINTENANCE_END: "2025-02-01 11:00:00 PM",
      SPA_ENV_ABCD_TIME_FORMAT: "YYYY-MM-DD h:mm:ss A"
    });
    console.log("command: ", command);
    await startLocalServiceWith(command);
    await tryServer(localServiceUrl, "GET");
  }, 30000);

  it("(Spa env server) Should respond with a 200 to the /hello endpoint", async () => {
    const response = await fetch(`${localServiceUrl}/hello`, {
      method: "GET",
    });
    expect(response.status).toBe(200);
  });

  it("(Spa env server) Should respond with a 404 to the /monitor endpoint when not initialized in environment variables", async () => {
    const response = await fetch(`${localServiceUrl}/monitor`, {
      method: "GET",
    });
    expect(response.status).toBe(404);
  });

  it("(Spa env server) Should respond with a 403 to the /env endpoint when SPA_ENV_NAME header not present", async () => {
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
    });
    expect(response.status).toBe(403);
  });

  it("(Spa env server) Should respond with a 200 to the /env endpoint when SPA_ENV_NAME header is present and contains the value 'SPA_ENV_NOW')", async () => {
    let headers = new Headers();
    headers.set("Authorization", "spaenv XXX");
    headers.set("SPA_ENV_NAME", "SPA_ENV_NOW");
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers,
    });
    expect(response.status).toBe(200);
  });

  it("(Spa env server) Should respond with a 403 to the /env endpoint when SPA_ENV_ header is present but does not match environment variables", async () => {
    let headers = new Headers();
    headers.set("Authorization", "spaenv XXX");
    headers.set("SPA_ENV_NAME", "SPA_ENV_FOOBAR");
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers,
    });
    expect(response.status).toBe(403);
  });

  it("(Spa env server) Should respond with a 200 to the /env endpoint when SPA_ENV_ header is present and does match environment variables", async () => {
    let headers = new Headers();
    headers.set("Authorization", "spaenv XXX");
    headers.set("SPA_ENV_NAME", `SPA_ENV_ABCD_MAINTENANCE_FLAG`);
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers,
    });
    expect(response.status).toBe(200);
  });

  it("(Spa env server) Should respond with a 200 to the /env endpoint when SPA_ENV_ header is present and does match environment variables", async () => {
    let headers = new Headers();
    headers.set("Authorization", "spaenv XXX");
    headers.set("SPA_ENV_NAME", `{"SPA_ENV_ABCD_MAINTENANCE_FLAG":"", "SPA_ENV_ABCD_MAINTENANCE_START":"", "SPA_ENV_ABCD_MAINTENANCE_END":""}`);
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers,
    });
    expect(response.status).toBe(200);
  });
});

