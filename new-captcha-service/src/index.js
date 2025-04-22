import express from "express";

const SERVICE_PORT = 3000;

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(SERVICE_PORT);
