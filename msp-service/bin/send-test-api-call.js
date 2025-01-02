//This script sends a test API call to the msp-service
//If all three of the mock services are running, you'll see a successful log in the mock-api

const { exec } = require("child_process");
const jwt = require("jsonwebtoken");

const SECRET = "defaultSecret";
const SERVICE_PORT = 8080; //needs to be 8080 because that's what's in the index.js

const token = jwt.sign(
  {
    data: {
      nonce: "123e4567-e89b-12d3-a456-426655440000",
    },
  },
  SECRET,
  {
    expiresIn: "30m",
  }
);

const testBody = { body: "xyz", logsource: "test curl request" };

// const decoded = jwt.verify(token, SECRET);

const command = `curl -XPOST -H "X-Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"body": "xyz", "logsource":"test curl request" }' localhost:${SERVICE_PORT}/MSPDESubmitAttachment/123e4567-e89b-12d3-a456-426655440000`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Execution error: ${error.message}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});

