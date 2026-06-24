import {
  tryServer,
  generatePortNumber,
  generateLogCommand,
  startLocalServiceWith,
} from "../test-helpers.js";

describe("Start local servers, test APIs", async () => {
  const port = generatePortNumber();
  const localServiceUrl = `http://localhost:${port}`;
  //used to initialize test server and verify output in later tests
  const placeholderStart = "2025-02-01 07:00:00 AM";
  const placeholderEnd = "2025-02-01 11:00:00 PM";

  beforeAll(async () => {
    const command = generateLogCommand({
      SERVICE_USE_AUTH: false,
      SERVICE_PORT: port,
      SPA_ENV_ABCD_MAINTENANCE_START: placeholderStart,
      SPA_ENV_ABCD_MAINTENANCE_END: placeholderEnd,
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
    headers.set("SPA_ENV_NAME", "SPA_ENV_NOW");
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers,
    });
    expect(response.status).toBe(200);
  });

  it("(Spa env server) Should respond with a 403 to the /env endpoint when SPA_ENV_ header is present but does not match environment variables", async () => {
    let headers = new Headers();
    headers.set("SPA_ENV_NAME", "SPA_ENV_FOOBAR");
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers,
    });
    expect(response.status).toBe(403);
  });

  it("(Spa env server) Should respond with a 200 to the /env endpoint when SPA_ENV_ header is present and does match environment variables", async () => {
    let headers = new Headers();
    headers.set("SPA_ENV_NAME", `SPA_ENV_ABCD_MAINTENANCE_FLAG`);
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers,
    });
    expect(response.status).toBe(200);
  });

  it("(Spa env server) Should respond with a 200 to the /env endpoint when SPA_ENV_ header is present and does match environment variables", async () => {
    let headers = new Headers();
    headers.set("SPA_ENV_NAME", `{"SPA_ENV_ABCD_MAINTENANCE_FLAG":"", "SPA_ENV_ABCD_MAINTENANCE_START":"", "SPA_ENV_ABCD_MAINTENANCE_END":""}`);
    await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers,
    }).then(function (response){
      // The service returns a readable stream that needs to be parsed
      // response.json does that so we can access the data
      expect(response.status).toBe(200);
      return response.json();
    }) .then(function (data) {
       expect(data.SPA_ENV_ABCD_MAINTENANCE_FLAG).toBeTypeOf("string");
       expect(data.SPA_ENV_ABCD_MAINTENANCE_START).toBeTypeOf("string");
       expect(data.SPA_ENV_ABCD_MAINTENANCE_START).toEqual(placeholderStart)
       expect(data.SPA_ENV_ABCD_MAINTENANCE_END).toBeTypeOf("string");
       expect(data.SPA_ENV_ABCD_MAINTENANCE_END).toEqual(placeholderEnd)
    })
  });
});

describe("Service Auth tests", async () => {
  const port = generatePortNumber();
  const localServiceUrl = `http://localhost:${port}`;
  const matchingAuthToken = "abcdefg"
  const nonMatchingAuthToken = "zyxwvuts" 

  beforeAll(async () => {
    const command = generateLogCommand({
      SERVICE_USE_AUTH: true,
      SERVICE_AUTH_TOKEN: matchingAuthToken,
      SERVICE_PORT: port,
      SPA_ENV_ABCD_MAINTENANCE_FLAG: true,
      SPA_ENV_ABCD_MAINTENANCE_START: "2025-02-01 07:00:00 AM",
      SPA_ENV_ABCD_MAINTENANCE_END: "2025-02-01 11:00:00 PM",
    });
    // console.log("command: ", command);
    await startLocalServiceWith(command);
    await tryServer(localServiceUrl, "GET");
  }, 30000);

  it("(Spa env server) Should respond with a 200 to the /env endpoint when authorization matches", async () => {
    let headers = new Headers();
    headers.set("SPA_ENV_NAME", "SPA_ENV_NOW");
    headers.set("Authorization", `spaenv ${matchingAuthToken}`);
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers
    });
    expect(response.status).toBe(200);
  });

  it("(Spa env server) Should respond with a 403 to the /env endpoint when authorization does not match", async () => {
    let headers = new Headers();
    headers.set("SPA_ENV_NAME", "SPA_ENV_NOW");
    headers.set("Authorization", `spaenv ${nonMatchingAuthToken}`);
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers
    });
    expect(response.status).toBe(403);
  });

  it("(Spa env server) Should respond with a 403 to the /env endpoint when token matches but 'spaenv' has a space in it by mistake", async () => {
    let headers = new Headers();
    headers.set("SPA_ENV_NAME", "SPA_ENV_NOW");
    //note the space between "spa" and "env"-- it's supposed to be "spaenv"
    headers.set("Authorization", `spa env ${matchingAuthToken}`);
    const response = await fetch(`${localServiceUrl}/env`, {
      method: "POST",
      headers
    });
    expect(response.status).toBe(403);
  });
});
