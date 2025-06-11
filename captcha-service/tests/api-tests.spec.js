import {
  tryServer,
  generateServiceCommand,
  generatePortNumber,
  startLocalServiceWith,
} from "./test-helpers.js";
import pkg from "node-jose";
import jwt from "jsonwebtoken";
const { JWE } = pkg;

let captchaServiceURL;

//this is a test key for development purposes. Don't use in production
const fakePrivateKey = `{
  "kty": "oct",
  "kid": "gBdaS-G8RLax2qObTD94w",
  "use": "enc",
  "alg": "A256GCM",
  "k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"
}`;

const rightAnswer = "aaaaaa";
const wrongAnswer = "zzzzzz";
const bypassAnswer = "bbbbbb";

const rightNonce = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const wrongNonce = "1aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const invalidNonce = "12345";

const fakeJWEBody = {
  nonce: rightNonce,
  answer: rightAnswer,
  expiry: Date.now() + 10800000,
};

const fakeJWEBuffer = Buffer.from(JSON.stringify(fakeJWEBody));

const fakeJWE = await JWE.createEncrypt(JSON.parse(fakePrivateKey)).update(fakeJWEBuffer).final();

const expiredJWEBody = {
  nonce: rightNonce,
  answer: rightAnswer,
  expiry: Date.now() - 20800000,
};

const expiredJWEBuffer = Buffer.from(JSON.stringify(expiredJWEBody));

const expiredJWE = await JWE.createEncrypt(JSON.parse(fakePrivateKey))
  .update(expiredJWEBuffer)
  .final();

const defaultSecret = "defaultSecret";

describe("Captcha server basics", async () => {
  //the testing suite starts up a local version of the server with different environment variables to test different scenarios
  //so before we do anything else, we need to make sure it's up and receiving traffic
  beforeAll(async () => {
    const standardPort = generatePortNumber();
    const defaultCommand = generateServiceCommand({
      SERVICE_PORT: standardPort,
      BYPASS_ANSWER: bypassAnswer,
      SECRET: defaultSecret,
    });
    startLocalServiceWith(defaultCommand);
    // console.log("command started with: ", defaultCommand);
    captchaServiceURL = `http://localhost:${standardPort}`;
    await tryServer(captchaServiceURL, "HEAD");
  }, 30000);

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
});

describe("/captcha endpoint", async () => {
  beforeAll(async () => {
    const standardPort = generatePortNumber();
    const defaultCommand = generateServiceCommand({
      SERVICE_PORT: standardPort,
      BYPASS_ANSWER: bypassAnswer,
      SECRET: defaultSecret,
    });
    startLocalServiceWith(defaultCommand);
    // console.log("command started with: ", defaultCommand);
    captchaServiceURL = `http://localhost:${standardPort}`;
    await tryServer(captchaServiceURL, "HEAD");
  }, 30000);

  it("(Captcha service) Should respond with a 400 to the /captcha endpoint with no nonce in the request body", async () => {
    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /captcha endpoint with a null nonce", async () => {
    const nonce = null;
    const requestBody = { nonce: nonce };

    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // this line is important, if this content-type is not set it wont work
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /captcha endpoint with incorrect nonce format", async () => {
    const nonce = invalidNonce;
    const requestBody = { nonce: nonce };

    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 200 and properly formatted object to the /captcha endpoint", async () => {
    const nonce = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const requestBody = { nonce: nonce };

    await fetch(`${captchaServiceURL}/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(function (response) {
        // The captcha returns a readable stream that needs to be parsed
        // response.json does that so we can access the data
        expect(response.status).toEqual(200);
        return response.json();
      })
      .then(function (data) {
        // `data` is the parsed version of the JSON returned from the above
        //Nonce
        expect(data.nonce).toBeTypeOf("string");
        expect(data.nonce).toEqual(nonce);

        //Captcha
        expect(data.captcha).toBeTypeOf("string");

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
});

describe("/verify/captcha endpoint", async () => {
  beforeAll(async () => {
    const standardPort = generatePortNumber();
    const defaultCommand = generateServiceCommand({
      SERVICE_PORT: standardPort,
      BYPASS_ANSWER: bypassAnswer,
      SECRET: defaultSecret,
    });
    startLocalServiceWith(defaultCommand);
    // console.log("command started with: ", defaultCommand);
    captchaServiceURL = `http://localhost:${standardPort}`;
    await tryServer(captchaServiceURL, "HEAD");
  }, 30000);

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint with no nonce", async () => {
    const response = await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
    });
    expect(response.status).toBe(400);
  });

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint with a null nonce", async () => {
    const nonce = null;
    const requestBody = { nonce: nonce };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint with incorrect nonce format", async () => {
    const nonce = invalidNonce;
    const requestBody = { nonce: nonce };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 200 to the /verify/captcha endpoint when nonce is correctly formatted and captcha is bypassed", async () => {
    const nonce = wrongNonce;
    const requestBody = { nonce: nonce, answer: bypassAnswer, validation: fakeJWE };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(200);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint when nonce is fine, captcha answer is wrong and isn't bypassed, and validation is missing", async () => {
    const nonce = wrongNonce;
    const requestBody = { nonce: nonce, answer: wrongAnswer };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint when nonce is fine, captcha answer is wrong and isn't bypassed, and validation isn't an object", async () => {
    const nonce = wrongNonce;
    const requestBody = { nonce: nonce, answer: wrongAnswer, validation: "foobar" };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint when nonce is fine, captcha answer is wrong and isn't bypassed, and validation is missing protected property", async () => {
    const nonce = wrongNonce;

    const requestBody = {
      nonce: nonce,
      answer: wrongAnswer,
      validation: { iv: "foobar", ciphertext: "foobar", tag: "foobar" },
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint when nonce is fine, captcha answer is wrong and isn't bypassed, and validation is missing iv property", async () => {
    const nonce = wrongNonce;

    const requestBody = {
      nonce: nonce,
      answer: wrongAnswer,
      validation: { protected: "foobar", ciphertext: "foobar", tag: "foobar" },
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint when nonce is fine, captcha answer is wrong and isn't bypassed, and validation is missing ciphertext property", async () => {
    const nonce = wrongNonce;

    const requestBody = {
      nonce: nonce,
      answer: wrongAnswer,
      validation: { protected: "foobar", iv: "foobar", tag: "foobar" },
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 400 to the /verify/captcha endpoint when nonce is fine, captcha answer is wrong and isn't bypassed, and validation is missing tag property", async () => {
    const nonce = wrongNonce;

    const requestBody = {
      nonce: nonce,
      answer: wrongAnswer,
      validation: { protected: "foobar", iv: "foobar", ciphertext: "foobar" },
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("(Captcha service) Should respond with a 500 to the /verify/captcha endpoint when nonce is fine, captcha answer is wrong and isn't bypassed, and validation is corrupted", async () => {
    const nonce = wrongNonce;

    const requestBody = {
      nonce: nonce,
      answer: wrongAnswer,
      validation: {
        protected: "foobar",
        iv: "foobar",
        ciphertext: "foobar",
        tag: "foobar",
      },
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(500);
    });
  });

  it("(Captcha service) Should respond with a 200 to the /verify/captcha endpoint when nonce is fine, captcha answer is wrong and isn't bypassed, and JWE is expired", async () => {
    const nonce = wrongNonce;

    const requestBody = {
      nonce: nonce,
      answer: wrongAnswer,
      validation: expiredJWE,
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(200);
    });
  });

  it("(Captcha service) Should respond with a 200 to the /verify/captcha endpoint when nonce is valid, captcha answer is wrong and isn't bypassed, and JWE nonce doesn't match request nonce", async () => {
    const nonce = wrongNonce;

    const requestBody = {
      nonce: nonce,
      answer: wrongAnswer,
      validation: fakeJWE,
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(200);
    });
  });

  it("(Captcha service) Should respond with a 200 to the /verify/captcha endpoint when nonce is valid, captcha answer is wrong and isn't bypassed, and JWE nonce matches", async () => {
    const nonce = rightNonce;

    const requestBody = {
      nonce: nonce,
      answer: wrongAnswer,
      validation: fakeJWE,
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(200);
    });
  });

  it("(Captcha service) Should respond with a 200 and signed JWT to the /verify/captcha endpoint when nonce is valid, captcha answer is correct, and JWE nonce matches", async () => {
    const nonce = rightNonce;

    const requestBody = {
      nonce: nonce,
      answer: rightAnswer,
      validation: fakeJWE,
    };

    await fetch(`${captchaServiceURL}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(function (response) {
        expect(response.status).toBe(200);
        return response.json();
        // })
      })
      .then(function (data) {
        expect(data.valid).toEqual(true);
        expect(data).toHaveProperty("jwt");

        //MSP service needs to be able to decode this secret
        //Verify that it's correctly formatted for that
        const token = data.jwt;
        const decoded = jwt.verify(token, defaultSecret);

        expect(decoded.data.nonce).toEqual(rightNonce);
      });
  });
});

describe("/captcha/audio endpoint", async () => {
  beforeAll(async () => {
    // const standardPort = "3000";
    const standardPort = generatePortNumber();
    const defaultCommand = generateServiceCommand({
      SERVICE_PORT: standardPort,
      BYPASS_ANSWER: bypassAnswer,
      SECRET: defaultSecret,
    });
    startLocalServiceWith(defaultCommand);
    // console.log("command started with: ", defaultCommand);
    captchaServiceURL = `http://localhost:${standardPort}`;
    await tryServer(captchaServiceURL, "HEAD");
  }, 30000);

  it("Should respond with a 400 to the /captcha/audio endpoint with no post body", async () => {
    const response = await fetch(`${captchaServiceURL}/captcha/audio`, {
      method: "POST",
    });
    expect(response.status).toBe(400);
  });

  it("Should respond with a 400 to the /captcha/audio endpoint with an empty body", async () => {
    const requestBody = {};
    const response = await fetch(`${captchaServiceURL}/captcha/audio`, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    expect(response.status).toBe(400);
  });

  it("Should respond with a 400 to the /captcha/audio endpoint with a non-JWE body format", async () => {
    //this request body is missing the tag property, which it needs
    const requestBody = { validation: { protected: "foobar", iv: "foobar", ciphertext: "foobar" } };

    await fetch(`${captchaServiceURL}/captcha/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(400);
    });
  });

  it("Should respond with a 500 to the /captcha/audio endpoint with a body that can't be decrypted", async () => {
    const requestBody = {
      validation: { protected: "foobar", iv: "foobar", ciphertext: "foobar", tag: "foobar" },
    };

    await fetch(`${captchaServiceURL}/captcha/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(function (response) {
      expect(response.status).toBe(500);
    });
  });

  it("Should respond with a 200 and audio stream to the /captcha/audio endpoint with a correctly formatted JWE in the post body", async () => {
    const requestBody = { validation: fakeJWE };

    await fetch(`${captchaServiceURL}/captcha/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(function (response) {
        // The captcha returns a readable stream that needs to be parsed
        // response.json does that so we can access the data
        expect(response.status).toEqual(200);
        return response.json();
      })
      .then(function (data) {
        const audio = data.audio;
        const split = audio.split(",");
        //mime type should be correct
        expect(split[0]).toEqual("data:audio/mp3;base64");
        //audio should be base64
        //regex taken from stack overflow: https://stackoverflow.com/questions/475074/regex-to-parse-or-validate-base64-data

        const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

        const regexTest = base64Regex.test(split[1]);

        expect(regexTest).toBe(true);
      });
  });
});

describe("General rate limiting", async () => {
  const RATE_LIMIT = 25;
  const AUDIO_RATE_LIMIT = 5;

  let ephemeralServerUrl;

  beforeEach(async () => {
    const ephemeralPort = generatePortNumber();
    const defaultCommand = generateServiceCommand({
      SERVICE_PORT: ephemeralPort,
      BYPASS_ANSWER: bypassAnswer,
      SECRET: defaultSecret,
      RATE_LIMIT,
      AUDIO_RATE_LIMIT,
    });
    startLocalServiceWith(defaultCommand);
    // console.log("command started with: ", defaultCommand);
    ephemeralServerUrl = `http://localhost:${ephemeralPort}`;
    await tryServer(ephemeralServerUrl, "HEAD");
  }, 30000);

  it("/captcha should respond with a 429 after RATE_LIMIT is reached", async () => {
    const nonce = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const requestBody = { nonce: nonce };

    //reach the API limit
    for (let i = 0; i < RATE_LIMIT; i++) {
      const response = await fetch(`${ephemeralServerUrl}/captcha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
    }

    //now that the limit has been reached, any subsequent API calls should respond with a 429
    const response = await fetch(`${ephemeralServerUrl}/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    expect(response.status).toBe(429);
  });

  it("/verify/captcha should respond with a 429 after RATE_LIMIT is reached", async () => {
    const nonce = wrongNonce;
    const requestBody = { nonce: nonce, answer: bypassAnswer, validation: fakeJWE };

    //reach the API limit
    for (let i = 0; i < RATE_LIMIT; i++) {
      const response = await fetch(`${ephemeralServerUrl}/verify/captcha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      expect(response.status).toBe(200);
    }

    //now that the limit has been reached, any subsequent API calls should respond with a 429
    const response = await fetch(`${ephemeralServerUrl}/verify/captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    expect(response.status).toBe(429);
  });

  it("/captcha/audio should respond with a 429 after AUDIO_RATE_LIMIT is reached", async () => {
    const requestBody = { validation: fakeJWE };

    //reach the API limit
    for (let i = 0; i < AUDIO_RATE_LIMIT; i++) {
      const response = await fetch(`${ephemeralServerUrl}/captcha/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      expect(response.status).toBe(200);
    }

    //now that the limit has been reached, any subsequent API calls should respond with a 429
    const response = await fetch(`${ephemeralServerUrl}/captcha/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    expect(response.status).toBe(429);
  });
});
