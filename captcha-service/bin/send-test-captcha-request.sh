FORWARDER_PORT=3000 #needs to match the forwarder port used in index.js

curl -XPOST -v -H "Authorization: Api-Token XXX" -H "Content-Type: application/json" -d '{"nonce": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}' localhost:${FORWARDER_PORT}/captcha
