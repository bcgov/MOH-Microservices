export LOGGER_HOST=localhost
export LOGGER_PORT=3000 # needs to match whatever's in mock-logger.js
export HOSTNAME=""
export TARGET_URL=http://localhost:3001
export USE_AUTH_TOKEN=true
export AUTH_TOKEN_KEY=defaultSecret

# if [ $1 = "--test" ]; then
    # echo "Running in test mode (local forwarder only)"
    # nodemon bin/mock-logger.js & node src/index.js server 
# else
    # echo "Running in development mode (mock-logger and forwarder)"
    # nodemon bin/mock-logger.js & nodemon src/index.js server
    # nodemon bin/mock-logger.js
    # nodemon bin/mock-api.js
    nodemon src/index.js server 
# fi


