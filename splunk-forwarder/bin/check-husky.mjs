import { exec } from "child_process";

console.log("(check-husky.mjs) checking environment before installing Husky...");
console.log(`(check-husky.mjs) Env: ${process.env.NODE_ENV} CI: ${process.env.CI} `);
if (process.env.NODE_ENV === "production" || process.env.CI === "true") {
  console.log("(check-husky.mjs) skipping husky in CI build");
  process.exit(0);
}

console.log("(check-husky.mjs) environment verified. preparing to call script in project root");

const command = `sh -c 'cd .. && node .husky/install.mjs'`;
exec(command, (error, stdout, stderr) => {
  console.log("(check-husky.mjs) check-husky results: ", stdout);
  if (error) {
    console.error(`(check-husky.mjs) Husky install execution error: ${error.message}`);
    return;
  }
});
