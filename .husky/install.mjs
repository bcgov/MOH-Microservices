// Skip Husky install in production and CI
if (process.env.NODE_ENV === "production" || process.env.CI === "true") {
  process.exit(0);
}

try {
  const husky = (await import("husky")).default;
  console.log(husky());
} catch (error) {
  console.log(
    "Husky install failed. Try running `npm i` at the project root first"
  );
  console.error("More information:", error);
  process.exit(1);
}
