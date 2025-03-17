export const checkEnvBoolean = (env) => {
  return env && env.toLowerCase() === "true";
};

export const generateTimeout = (attemptNumber) => {
  //uses the loop number to generate an exponential timeout-- 1, 2, 4, 8, 16 seconds, etc
  //measured in milliseconds, so 1000ms = 1 second of wait time
  //For the first loop, 2 to the power of 0 equals 1, and 1 * 1000 ms = 1 second to start
  //ceiling is 60 seconds between tries
  let result = 1000 * 2 ** attemptNumber;
  if (result > 60000) {
    result = 60000;
  }
  return result;
};
