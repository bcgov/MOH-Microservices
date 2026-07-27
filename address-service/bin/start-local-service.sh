export FORWARDER_PORT=8080 #needs to match the port number used in send-test-request.sh
export ADDRESS_VALIDATOR_URL="http://localhost:3001" #needs to match the port number used in mock-api.js

nodemon src/index.js server