# MOH-Microservices
![img](https://img.shields.io/badge/Lifecycle-Stable-97ca00)

Contains microservices used across multiple HIBC applications.

## Address-service

Used to allow users to autocomplete their address when filling out a form.

## BCSC-service

Used to allow users to log into the AOP application using their BC Services Card.

## Captcha-service

Used to verify a user's humanity by requiring them to fill out a captcha before filling out a form

## MSP-service

Used to send out API requests to HIBC infrastructure

## Spa-env-server

Used to convey maintenance windows and other real-time information to the application, so its behavior can be changed without code updates

## Splunk-forwarder

Used to format and transport logs from the application to our long-term log storage solution. Named Splunk-forwarder for historical reasons, but currently configured to work with Dynatrace.