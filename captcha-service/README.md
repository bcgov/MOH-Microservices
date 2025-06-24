# MOH-Microservices Captcha

This project enables developers to include a CAPTCHA widget in their online digital form to protect against bots.

This is just the microservice part of an overall solution-- it's designed to interface with the front-end captcha components in the MOH common libraries for [Vue]{https://github.com/bcgov/common-lib-vue} and [Angular]{https://github.com/bcgov/moh-common-styles}.

## Overall Use Case

1. User is given a captcha challenge to complete before submitting the form
2. User transcribes the image (or audio file) presented to them
3. If the user-provided answer matches what the API is expecting, the user is allowed to proceed, otherwise the user is blocked until they successfully complete the captcha

## Microservice/Component program flow

1. User agent (i.e. browser) loads the common library captcha component as part of a Vue/Angular application. Application passes the Component a unique identifier (nonce), which is included in all requests to and from the API
2. On startup, the Component calls the Microservice through the `/captcha` API endpoint
3. The Microservice API responds in JSON format with a captcha image and an encrypted JWT containing the correct captcha answer. The Component retains the JWT for future use
4. The Component processes the JSON object and displays the CAPTCHA image to the user
   - Optional: User requests an audio captcha through the Component
   - The Component sends a call to the Microservice's `/captcha/audio` endpoint, including the JWT in the payload
   - The Microservice API processes/decrypts the JWT to determine what the correct captcha answer is
   - The Microservice API responds with a text-to-speech audio file containing the captcha answer
   - The Component processes the audio file and plays it back for the user
5. User transcribes the captcha image/audio file into the Component
6. The Component submits the answer and JWT to the Microservice through the `/verify/captcha` endpoint
7. The Microservice decrypts the JWT to determine what the correct captcha answer is
8. If the submitted answer matches the correct answer (or if the captcha answer matches the bypass answer passed down in the environment variables), the Microservice returns a valid response and a signed JWT that the user can use with the msp-service on form submission. The Component closes and allows the user to proceed.
9. If the submitted answer does not match, the Microservice returns an invalid response and The Component requests a new captcha challenge so the user can try again.
