# Changelog

## 2.0.0 · 2025-11-25

- **Breaking change:** Introduced `response.send()`, which must be used instead of `response.end()`.

## 1.0.14 · 2025-11-19

- Simplified the way that the server keeps track of Live Connections.

## 1.0.13 · 2025-07-24

- Added a way for `redirect()` to say that it’s special for Live Connections, sending an HTTP status of 200.

## 1.0.12 · 2025-05-08

- Added support for external redirects in Live Navigation by returning HTTP status 200.

## 1.0.11 · 2025-04-18

- Fixed type `RequestBodyFile` by declaring `@types/busboy` as a `dependency` instead of `devDependency`.

## 1.0.9 · 2025-01-09

- Added support for `array[]` parameters in `request.search`, similar to `request.body`.

## 1.0.8 · 2024-06-21

- Added support for flash via `response.setFlash()` and `request.getFlash()`.

## 1.0.7 · 2024-06-05

- Introduced an `error` that’s the string `"validation"`, which sets the default HTTP status code to 422 instead of 500.

## 1.0.6 · 2024-06-04

- Changed the error handler so that it defaults to a HTTP status code of 500.

## 1.0.5 · 2024-05-01

- Added the word `SERVER` to the logs.

## 1.0.4 · 2024-04-30

- Added the `Server` auxiliary type.

## 1.0.3 · 2024-04-30

- Removed the `Route.local` option.

## 1.0.2 · 2024-04-26

- Updated `@radically-straightforward/utilities`, which adds support for background jobs that throw an exception.

## 1.0.1 · 2024-04-09

- Update dependencies.

## 1.0.0 · 2024-03-17

- Initial release with initial features:
  - Router.
  - Request Parsing.
  - Response Helpers.
  - Live Connection.
  - Health Check.
  - Image/Video/Audio Proxy.
  - CSRF Protection.
  - Convenient Defaults.
