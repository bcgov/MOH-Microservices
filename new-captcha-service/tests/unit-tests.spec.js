import {
  verifyPrivateKey,
  verifyJwtExpiry,
  verifyIncomingNonce,
  generateCaptcha,
  signObject,
  decryptJWE,
  encryptJWE,
  verifyIsJWE,
  verifyMp3Integrity,
  convertWavToMp3,
  getSpacedAnswer,
} from "../src/helper.js";
import * as path from "path";
import fs from "fs";

describe("verifyPrivateKey()", async () => {
  it("Should not throw error when passed properly formatted object", async () => {
    //body needs to be parseable JSON
    //needs to follow JWK format, including a kty, use, alg, and k properties
    //kty needs to be oct
    //use needs to be enc
    const body = { kty: "oct", use: "enc", alg: "foobar", k: "foobar" };
    expect(() => verifyPrivateKey(JSON.stringify(body))).not.toThrowError();
  });

  it("Should throw error when not passed JSON", async () => {
    const body = "";
    expect(() => verifyPrivateKey(JSON.stringify(body))).toThrowError();
  });

  it("Should throw error when passed empty object", async () => {
    const body = {};
    expect(() => verifyPrivateKey(JSON.stringify(body))).toThrowError();
  });

  it("Should throw error when kty is missing", async () => {
    const body = { use: "enc", alg: "foobar", k: "foobar" };
    expect(() => verifyPrivateKey(JSON.stringify(body))).toThrowError();
  });
  it("Should throw error when use is missing", async () => {
    const body = { kty: "oct", alg: "foobar", k: "foobar" };
    expect(() => verifyPrivateKey(JSON.stringify(body))).toThrowError();
  });
  it("Should throw error when alg is missing", async () => {
    const body = { kty: "oct", use: "enc", k: "foobar" };
    expect(() => verifyPrivateKey(JSON.stringify(body))).toThrowError();
  });
  it("Should throw error when k is missing", async () => {
    const body = { kty: "oct", use: "enc", alg: "foobar" };
    expect(() => verifyPrivateKey(JSON.stringify(body))).toThrowError();
  });
  it("Should throw error when kty isn't 'oct'", async () => {
    const body = { kty: "foobar", use: "enc", alg: "foobar", k: "foobar" };
    expect(() => verifyPrivateKey(JSON.stringify(body))).toThrowError();
  });
  it("Should throw error when use isn't 'enc'", async () => {
    const body = { kty: "oct", use: "foobar", alg: "foobar", k: "foobar" };
    expect(() => verifyPrivateKey(JSON.stringify(body))).toThrowError();
  });
});

describe("verifyIncomingNonce()", async () => {
  it("Should return true when passed a properly formatted uuid string", async () => {
    const body = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(true);
  });
  it("Should return true when passed a properly formatted uuid string (with numbers)", async () => {
    const body = "11111111-2222-3333-4444-555555555555";
    expect(verifyIncomingNonce(body)).toBe(true);
  });
  it("Should return true when passed a properly formatted uuid string (with capital letters)", async () => {
    const body = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
    expect(verifyIncomingNonce(body)).toBe(true);
  });
  it("Should return false when passed empty string", async () => {
    const body = "";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when passed array", async () => {
    const body = [];
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when passed object", async () => {
    const body = {};
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when passed extra character (first part)", async () => {
    //one extra character in first part
    const body = "aaaaaaaaQ-bbbb-cccc-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when passed extra character (second part)", async () => {
    //one extra character in second part
    const body = "aaaaaaaa-bbbbQ-cccc-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when passed extra character (third part)", async () => {
    //one extra character in third part
    const body = "aaaaaaaa-bbbb-ccccQ-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when passed extra character (fourth part)", async () => {
    //one extra character in fourth part
    const body = "aaaaaaaa-bbbb-cccc-ddddQ-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when passed extra character (fifth part)", async () => {
    //one extra character in fourth part
    const body = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeQ";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing a character (first part)", async () => {
    //one extra character in first part
    const body = "aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing a character (second part)", async () => {
    //one extra character in second part
    const body = "aaaaaaaa-bbb-cccc-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing a character (third part)", async () => {
    //one extra character in third part
    const body = "aaaaaaaa-bbbb-ccc-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing a character (fourth part)", async () => {
    //one extra character in fourth part
    const body = "aaaaaaaa-bbbb-cccc-ddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing a character (fifth part)", async () => {
    //one extra character in fourth part
    const body = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing first hyphen", async () => {
    const body = "aaaaaaaabbbb-cccc-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing second hyphen", async () => {
    const body = "aaaaaaaa-bbbbcccc-dddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing third hyphen", async () => {
    const body = "aaaaaaaa-bbbb-ccccdddd-eeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
  it("Should return false when missing fourth hyphen", async () => {
    const body = "aaaaaaaa-bbbb-cccc-ddddeeeeeeeeeeee";
    expect(verifyIncomingNonce(body)).toBe(false);
  });
});

describe("verifyJwtExpiry()", async () => {
  it("Should return false when passed no arguments", async () => {
    expect(() => {
      verifyJwtExpiry();
    }).toThrowError();
  });
  it("Should return false when passed non-string", async () => {
    expect(() => {
      verifyJwtExpiry([]);
    }).toThrowError();
  });
  it("Should return false when passed number", async () => {
    expect(() => {
      verifyJwtExpiry(10);
    }).toThrowError();
  });
  it("Should return false when passed a string that can't be parsed to integer", async () => {
    expect(() => {
      verifyJwtExpiry("foobar");
    }).toThrowError();
  });
  it("Should return true when passed a parseable string", async () => {
    const body = "10";
    expect(verifyJwtExpiry(body)).toBe(true);
  });
});

describe("generateCaptcha()", async () => {
  const result = await generateCaptcha();
  it("Should generate an object", async () => {
    expect(result).toBeTypeOf("object");
  });

  it("Result should have expected properties", async () => {
    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("data");
  });

  it("Result.text should be a string", async () => {
    expect(result.text).toBeTypeOf("string");
  });

  it("Result.data should be a properly sized svg image", async () => {
    expect(result.data).toContain(`<svg`); //should contain svg image
    expect(result.data).toContain(`/></svg>`);
    expect(result.data).toContain('width="150"'); //svg width and height should be fixed
    expect(result.data).toContain('height="50"');
    expect(result.data).toContain('viewBox="0,0,150,50"');
  });
});

describe("signObject()", async () => {
  it("Should return properly formatted object when passed valid input", async () => {
    const nonce = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const secret = "defaultSecret";
    const expiry = "10";
    const result = await signObject(nonce, secret, expiry);

    expect(result).toBeTypeOf("object");
    expect(result).toHaveProperty("jwt");
    expect(result).toHaveProperty("valid");
    expect(result.valid).toBe(true);
    expect(result.jwt).toBeTypeOf("string");

    //JWTs always have three parts, delimited by periods
    //So if we split the result.jwt by periods, the resulting array should have three items in it

    const splitArray = result.jwt.split(".");
    expect(splitArray.length).toBe(3);
  });
  it("Should return false when not passed any arguments", async () => {
    const result = await signObject();
    expect(result).toBe(false);
  });
  it("Should return false when passed empty values", async () => {
    const nonce = "";
    const secret = "";
    const expiry = "";
    const result = await signObject(nonce, secret, expiry);
    expect(result).toBe(false);
  });
  it("Should throw an error when passed empty objects", async () => {
    const nonce = {};
    const secret = {};
    const expiry = {};
    await expect(signObject(nonce, secret, expiry)).rejects.toThrowError();
  });

  it("Should throw an error when expiry can't be parsed as a number (string)", async () => {
    const nonce = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const secret = "defaultSecret";
    const expiry = "aa";
    await expect(signObject(nonce, secret, expiry)).rejects.toThrowError();
  });

  it("Should throw an error when expiry can't be parsed as a number (alphanumeric)", async () => {
    const nonce = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const secret = "defaultSecret";
    const expiry = "10m";
    await expect(signObject(nonce, secret, expiry)).rejects.toThrowError();
  });

  it("Should throw an error when secret isn't a string", async () => {
    const nonce = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const secret = {};
    const expiry = "10";

    await expect(signObject(nonce, secret, expiry)).rejects.toThrowError();
  });
});

describe("encryptJWE()", async () => {
  it("Should return false when passed no parameters", async () => {
    const result = await encryptJWE();
    expect(result).toBe(false);
  });

  it("Should return false when passed empty strings", async () => {
    const nonce = "";
    const captcha = "";
    const privateKey = "";
    const expiry = "";
    const result = await encryptJWE(nonce, captcha, privateKey, expiry);
    expect(result).toBe(false);
  });

  it("Should return specifically formatted object when passed valid data", async () => {
    //nonce should be a string
    //captcha should be an object with the "text" property
    const nonce = "defaultNonce";
    const captcha = { text: "fakeText" };
    const privateKey = `{"kty": "oct","kid": "gBdaS-G8RLax2qObTD94w","use": "enc","alg": "A256GCM","k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"}`;
    const expiry = "10";
    const result = await encryptJWE(nonce, captcha, privateKey, expiry);

    expect(result).not.toBe(false);
    expect(result).toBeTypeOf("object");
    expect(result).toHaveProperty("ciphertext");
    expect(result).toHaveProperty("iv");
    expect(result).toHaveProperty("protected");
    expect(result).toHaveProperty("tag");

    expect(result.ciphertext).toBeTypeOf("string");
    expect(result.iv).toBeTypeOf("string");
    expect(result.protected).toBeTypeOf("string");
    expect(result.tag).toBeTypeOf("string");
  });

  it("Should return false when captcha is not an object", async () => {
    const nonce = "defaultNonce";
    const captcha = 2;
    const privateKey = `{"kty": "oct","kid": "gBdaS-G8RLax2qObTD94w","use": "enc","alg": "A256GCM","k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"}`;
    const expiry = "10";
    const result = await encryptJWE(nonce, captcha, privateKey, expiry);

    expect(result).toBe(false);
  });

  it("Should return false when captcha object does not contain the text property", async () => {
    const nonce = "defaultNonce";
    const captcha = { foobar: "fakeText" };
    const privateKey = `{"kty": "oct","kid": "gBdaS-G8RLax2qObTD94w","use": "enc","alg": "A256GCM","k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"}`;
    const expiry = "10";
    const result = await encryptJWE(nonce, captcha, privateKey, expiry);

    expect(result).toBe(false);
  });

  it("Should return false when expiry is invalid", async () => {
    const nonce = "defaultNonce";
    const captcha = { text: "fakeText" };
    const privateKey = `{"kty": "oct","kid": "gBdaS-G8RLax2qObTD94w","use": "enc","alg": "A256GCM","k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"}`;
    const expiry = "potato";
    const result = await encryptJWE(nonce, captcha, privateKey, expiry);

    expect(result).toBe(false);
  });

  it("Should return a JWE when nonce is a number", async () => {
    const nonce = 123;
    const captcha = { text: "fakeText" };
    const privateKey = `{"kty": "oct","kid": "gBdaS-G8RLax2qObTD94w","use": "enc","alg": "A256GCM","k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"}`;
    const expiry = "10";
    const result = await encryptJWE(nonce, captcha, privateKey, expiry);

    expect(result).toBeTypeOf("object");
    expect(result).not.toBe(false);
  });
});

describe("decryptJWE()", async () => {
  const defaultNonce = "defaultNonce";
  const defaultCaptcha = { text: "defaultText" };
  const defaultKey = `{"kty": "oct","kid": "gBdaS-G8RLax2qObTD94w","use": "enc","alg": "A256GCM","k": "FK3d8WvSRdxlUHs4Fs_xxYO3-6dCiUarBwiYNFw5hv8"}`;
  const defaultExpiry = "10";
  const testJWE = await encryptJWE(defaultNonce, defaultCaptcha, defaultKey, defaultExpiry);

  it("TestJWE should be correctly formatted", async () => {
    expect(testJWE).toBeTypeOf("object");
    expect(testJWE).toHaveProperty("ciphertext");
    expect(testJWE).toHaveProperty("iv");
    expect(testJWE).toHaveProperty("protected");
    expect(testJWE).toHaveProperty("tag");
  });

  it("Should return false when passed no parameters", async () => {
    const result = await decryptJWE();
    expect(result).toBe(false);
  });

  it("Should return a decrypted object when passed a valid JWE", async () => {
    const result = await decryptJWE(testJWE, defaultKey);
    expect(result).not.toBe(false);
    expect(result).toBeTypeOf("object");
    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("expiry");
    expect(result).toHaveProperty("nonce");

    expect(result.answer).toBeTypeOf("string");
    expect(result.answer).toEqual(defaultCaptcha.text);
    expect(result.expiry).toBeTypeOf("number");
    expect(result.nonce).toBeTypeOf("string");
  });

  it("Should return false when passed non-JWE string", async () => {
    const result = await decryptJWE("foobar");
    expect(result).toBe(false);
  });

  it("Should return false when passed non-JWE object", async () => {
    const result = await decryptJWE({ foobar: "foobar" });
    expect(result).toBe(false);
  });
});

describe("verifyIsJWE()", async () => {
  it("Should return false when passed no parameters", async () => {
    const result = await verifyIsJWE();
    expect(result).toBe(false);
  });

  it("Should return false when passed a string", async () => {
    const result = await verifyIsJWE("foobar");
    expect(result).toBe(false);
  });

  it("Should return false when passed an empty object", async () => {
    const result = await verifyIsJWE({});
    expect(result).toBe(false);
  });

  it("Should return true when passed an object with JWE properties", async () => {
    const result = await verifyIsJWE({
      protected: "foobar",
      iv: "foobar",
      ciphertext: "foobar",
      tag: "foobar",
    });
    expect(result).toBe(true);
  });

  it("Should return false when passed an object missing the 'protected' property", async () => {
    const result = await verifyIsJWE({
      // protected: "foobar", //should be commented out for this test
      iv: "foobar",
      ciphertext: "foobar",
      tag: "foobar",
    });
    expect(result).toBe(false);
  });

  it("Should return false when passed an object missing the 'iv' property", async () => {
    const result = await verifyIsJWE({
      protected: "foobar",
      // iv: "foobar", //should be commented out for this test
      ciphertext: "foobar",
      tag: "foobar",
    });
    expect(result).toBe(false);
  });

  it("Should return false when passed an object missing the 'ciphertext' property", async () => {
    const result = await verifyIsJWE({
      protected: "foobar",
      iv: "foobar",
      // ciphertext: "foobar", //should be commented out for this test
      tag: "foobar",
    });
    expect(result).toBe(false);
  });

  it("Should return false when passed an object missing the 'tag' property", async () => {
    const result = await verifyIsJWE({
      protected: "foobar",
      iv: "foobar",
      ciphertext: "foobar",
      // tag: "foobar" //should be commented out for this test
    });
    expect(result).toBe(false);
  });
});

describe("(test helper function) verifyMp3Integrity()", async () => {
  let testmp3;
  testmp3 = fs.readFileSync(path.resolve(__dirname, "./fixtures", "testmp3.mp3"));

  it("Should successfully read local test files", async () => {
    expect(testmp3).not.toBeUndefined();
  });

  it("Should return false when passed no parameters", async () => {
    const result = await verifyMp3Integrity();
    expect(result).toBe(false);
  });

  it("Should return false when passed an invalid mp3 file", async () => {
    const result = await verifyMp3Integrity("foobar");
    expect(result).toBe(false);
  });

  it("Should return true when passed a valid mp3 file", async () => {
    const result = await verifyMp3Integrity(testmp3);
    expect(result).toBe(true);
  });

  it("Should return true when passed a valid mp3 buffer", async () => {
    const buffer = Buffer.from(testmp3);
    const result = await verifyMp3Integrity(buffer);
    expect(result).toBe(true);
  });
});

describe("convertWavToMp3()", async () => {
  let testWav;
  testWav = fs.readFileSync(path.resolve(__dirname, "./fixtures", "testwav.wav"));

  it("Should successfully read local test files", async () => {
    expect(testWav).not.toBeUndefined();
  });

  it("Should return false when not passed input", async () => {
    const result = await convertWavToMp3();
    expect(result).toBe(false);
  });

  it("Should throw an error when passed an invalid wav file", async () => {
    await expect(convertWavToMp3("foobar")).rejects.toThrowError();
  });

  it("Should return a valid mp3 when passed a valid wav", async () => {
    const mp3 = await convertWavToMp3(testWav);
    expect(typeof mp3).toBe("object");
    const mp3Check = await verifyMp3Integrity(mp3);
    expect(mp3Check).toBe(true);
  });
});

describe("getSpacedAnswer()", async () => {
  it("Should return undefined when not passed arguments", async () => {
    const result = getSpacedAnswer();
    expect(result).toBeUndefined();
  });

  it("Should return body when passed a non-string (array)", async () => {
    const body = [];
    const result = getSpacedAnswer(body);
    expect(result).toEqual(body);
  });

  it("Should return body when passed a non-string (object)", async () => {
    const body = {};
    const result = getSpacedAnswer(body);
    expect(result).toEqual(body);
  });

  it("Should return body when passed a non-string (null)", async () => {
    const body = null;
    const result = getSpacedAnswer(body);
    expect(result).toEqual(body);
  });

  it("Should return body when passed a non-string (boolean)", async () => {
    const body = false;
    const result = getSpacedAnswer(body);
    expect(result).toEqual(body);
  });

  it("Should return a spaced out string when passed a string", async () => {
    const body = "aaaaaa";
    const result = getSpacedAnswer(body);
    expect(result).not.toEqual(body);
    //the next line can be changed or commented out if needed
    expect(result).toEqual("a; a; a; a; a; a; ");
  });
});
