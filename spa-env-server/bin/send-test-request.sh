FORWARDER_PORT=8080 

curl -XPOST -i -H "Authorization: spaenv XXX" -H "SPA_ENV_NAME: SPA_ENV_NOW" localhost:${FORWARDER_PORT}/env