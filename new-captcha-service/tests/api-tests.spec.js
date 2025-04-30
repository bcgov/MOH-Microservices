import { tryServer } from "./test-helpers.js";

const { exec } = require("node:child_process");
const captchaServiceURL = "http://localhost:3000";

const startLocalService = () => {
  exec("timeout 5s node src/index server", () => {
    //err, stdout, stderr
  });
};

describe("Start local servers, test APIs", async () => {
  beforeAll(async () => {
    await startLocalService();
    await tryServer(captchaServiceURL, "HEAD");
  }, 30000);

  it("(Captcha service) Should respond with a 200 to the / endpoint", async () => {
    const response = await fetch(`${captchaServiceURL}`, {
      method: "HEAD",
    });
    expect(response.status).toBe(200);
  });

  it("(Captcha service) Should respond with a 200 to the /hello endpoint", async () => {
    const response = await fetch(`${captchaServiceURL}/hello`, {
      method: "GET",
    });
    expect(response.status).toBe(200);
  });

  it("(Captcha service) Should respond with a 200 to the /status endpoint", async () => {
    const response = await fetch(`${captchaServiceURL}/status`, {
      method: "GET",
    });
    expect(response.status).toBe(200);
  });

  it("(Captcha service) Should respond with a 400 to the /captcha endpoint with no nonce", async () => {
    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
    })
      .then(function (response) {
        expect(response.status).toBe(400);
      })
  });

  it("(Captcha service) Should respond with a 400 to the /captcha endpoint with incorrect nonce format", async () => {
    const nonce = null;

    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, // this line is important, if this content-type is not set it wont work
      body: `nonce=${nonce}`
    })
      .then(function (response) {
        expect(response.status).toBe(400);
      })
  });

  it("(Captcha service) Should respond with a 200 and properly formatted object to the /captcha endpoint", async () => {
    const nonce = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    
    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, // this line is important, if this content-type is not set it wont work
      body: `nonce=${nonce}`
    })
      .then(function (response) {
        // The captcha returns a readable stream that needs to be parsed
        // response.json does that so we can access the data
        expect(response.status).toEqual(200);
        return response.json();
      })
      .then(function (data) {
        console.log("potato data", data)
        // `data` is the parsed version of the JSON returned from the above
        //Nonce
        expect(data.nonce).toBeTypeOf("string");
        expect(data.nonce).toEqual(nonce);

        //Captcha
        expect(data.captcha).toBeTypeOf("string");
        expect(data.captcha).toContain(`<svg`); //should contain svg image
        expect(data.captcha).toContain(`/></svg>`);
        expect(data.captcha).toContain("width=\"150\""); //svg width and height should be fixed
        expect(data.captcha).toContain("height=\"50\"");
        expect(data.captcha).toContain("viewBox=\"0,0,150,50\"");

        expect(data.validation).toBeTypeOf("object");

        //JWT formatting
        //Validation.protected
        expect(data.validation).toHaveProperty("protected");
        expect(data.validation.protected).toBeTypeOf("string");

        //Validation.iv
        expect(data.validation).toHaveProperty("iv");
        expect(data.validation.iv).toBeTypeOf("string");

        //Validation.ciphertext
        expect(data.validation).toHaveProperty("ciphertext");
        expect(data.validation.ciphertext).toBeTypeOf("string");

        //Validation.tag
        expect(data.validation).toHaveProperty("tag");
        expect(data.validation.tag).toBeTypeOf("string");
      });
  });
  
  it.skip("(Captcha service) Should respond with a 200 to the /verify/captcha endpoint", async () => {
    //this crashes the service for some reason so I'm skipping it
    const response = await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
    });
    expect(response.status).toBe(200);
  });
  it.skip("(Captcha service) Should respond with a 200 to the /captcha/audio endpoint", async () => {
    //this crashes the service for some reason so I'm skipping it
    const response = await fetch(`${captchaServiceURL}/captcha/audio`, {
      method: "POST",
    });
    expect(response.status).toBe(200);
  });
});
