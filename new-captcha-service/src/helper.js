import * as svgCaptcha from "svg-captcha";

export const generateDate = () => {
  const date = new Date().toLocaleDateString("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  return date;
};

export const generateCaptcha = async () => {
  const captcha = svgCaptcha.create({
    size: 6, // size of random string
    ignoreChars: "0oO1il", // filter out some characters like 0o1i
    noise: 2, // number of lines to insert for noise
  });

  console.log(`${generateDate()} winston debug: captcha generated: ${captcha.text}`);

  return captcha;
};
