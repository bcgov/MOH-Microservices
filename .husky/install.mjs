// Skip Husky install in production and CI
console.log("(install.mjs) reached in the project root. checking environment")
if (process.env.NODE_ENV === "production" || process.env.CI === "true") {
  process.exit(0);
}

console.log("(install.mjs) environment verified. preparing to execute husky install command")
try {
  const husky = (await import("husky")).default;
  console.log(husky());
  console.log("(install.mjs) husky successfully installed")
} catch (error) {
  console.log(
    "Husky install failed. Try running `npm i` at the project root first"
  );
  console.error("More information:", error);
  process.exit(1);
}
