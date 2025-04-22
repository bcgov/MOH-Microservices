import express from "express";

const SERVICE_PORT = 3000;

const app = express();

// health and readiness check
app.get("/hello", function (req, res) {
  res.status(200).end();
})

app.get("/status", function (req, res) {
res.send("OK")
})

app.post("/captcha/audio", function (req, res) {
  let response = {}
  return res.send(response)
})

app.post("/captcha", function (req, res) {
  let captcha = {}
  return res.send(captcha)
})

app.post("/verify/captcha", function (req, res) {
  let response = {}
  return res.send(response)
})

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(SERVICE_PORT);
