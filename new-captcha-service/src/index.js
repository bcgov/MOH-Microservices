import express from "express";

const SERVICE_PORT = 3000;

const generateDate = () => {
  const date = new Date().toLocaleDateString("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  return date;
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getCaptcha = (body) => {
  console.log(`${generateDate()} winston debug: getCaptcha: ${body.nonce}`);
  return { nonce: body.nonce };
};

// health and readiness check
app.get("/hello", function (req, res) {
  res.status(200).end();
});

app.get("/status", function (req, res) {
  res.send("OK");
});

app.post("/captcha/audio", function (req, res) {
  let response = {};
  return res.send(response);
});

app.post("/captcha", async function (req, res) {
  console.log(`${generateDate()} winston debug: /captcha body: `, req.body);
  if (!req.body || !Object.hasOwn(req.body, "nonce")) {
    console.log(`${generateDate()}`, "winston debug: Failed to generate captcha; no nonce.");
    return res.status(400).send({ reason: "Missing nonce" });
  }

  if (typeof req.body.nonce !== "string" && typeof req.body.nonce !== "number") {
    console.log(
      `${generateDate()}`,
      "winston debug: Failed to generate captcha; nonce is incorrect type."
    );
    return res.status(400).send({ reason: "Incorrect nonce format" });
  }
  const payload = await getCaptcha(req.body);
  return res.send(payload);
});

app.post("/verify/captcha", function (req, res) {
  let response = {};
  return res.status(200).send(response);
});

app.get("/", (req, res) => {
  return res.status(200).send("Hello world");
});

app.listen(SERVICE_PORT);
