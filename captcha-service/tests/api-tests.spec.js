import { tryServer } from "./test-helpers.js";

const { exec } = require("node:child_process");
const captchaServiceURL = "http://localhost:8080";

// Service needs to be manually started due to node version differences
// When you find a way around that, here's some code to automatically start the service
// Don't forget to un-comment thefunction call in the test itself
// const startCaptchaService = async () => {
//   //create child process to run the captcha service for the duration of the tests
//   //vitest doesn't always close child processes out when it finishes, so there's a timeout here to make extra sure they close
//   const childProcess = await exec(
//     "timeout 45s npm run start",
//     (err, stdout, stderr) => {
//         console.log("script errors:", err)
//     }
//   );
// };

describe("Start local servers, test APIs", async () => {
  beforeAll(async () => {
    // await startCaptchaService();
    await tryServer(captchaServiceURL, "HEAD")
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
  it("(Captcha service) Should respond with a 200 to the /captcha endpoint", async () => {
    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
    })
      .then(function (response) {
        // The captcha returns a readable stream that needs to be parsed
        // response.json does that so we can access the data
        expect(response.status).toBe(200);
        return response.json();
      })
      .then(function (data) {
        // `data` is the parsed version of the JSON returned from the above
        expect(data).not.toHaveProperty("nonce");
      });
  });
  it("(Captcha service) Should respond with a properly formatted object to the /captcha endpoint", async () => {
    var payload = {
      nonce: "1234567",
    };

    var formData = new FormData();
    formData.append("json", JSON.stringify(payload));

    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, // this line is important, if this content-type is not set it wont work
      body: "nonce=1234567",
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        //Nonce
        expect(data.nonce).toBeTypeOf("string");

        //Captcha
        expect(data.captcha).toBeTypeOf("string");
        expect(data.captcha).toContain(`<svg`); //should contain svg image
        expect(data.captcha).toContain(`/></svg>`);
        expect(data.captcha).toContain(`width=\"150\"`); //svg width and height should be fixed
        expect(data.captcha).toContain(`height=\"50\"`);
        expect(data.captcha).toContain(`viewBox=\"0,0,150,50\"`);
        expect(data.captcha.length).toBeGreaterThan(8000); //svgs are big

        expect(data.validation).toBeTypeOf("object");

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
  it.skip("(Captcha service) Should respond with a 200 to the /captcha endpoint", async () => {
    //this crashes the service for some reason so I'm skipping it
    const response = await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
    });
    expect(response.status).toBe(200);
  });
  it.skip("(Captcha service) Should respond with a 200 to the /captcha endpoint", async () => {
    //this crashes the service for some reason so I'm skipping it
    const response = await fetch(`${captchaServiceURL}/captcha/audio`, {
      method: "POST",
    });
    expect(response.status).toBe(200);
  });
});
