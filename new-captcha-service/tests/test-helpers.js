export const tryServer = async (website, HTTPMethod) => {
  const retryAttempts = 3;

  for (let i = 0; i < retryAttempts; i++) {
    try {
      await fetch(website, {
        method: HTTPMethod,
      });
      console.log(`successfully reached ${website}!`);
      return new Promise((resolve, reject) => {
        resolve();
      });
    } catch (error) {
      console.log(`failed to reach ${website}, attempt `, i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return new Promise((resolve, reject) => {
    reject(`Couldn't reach ${website} (tried ${retryAttempts} times and gave up)`);
  });
};
