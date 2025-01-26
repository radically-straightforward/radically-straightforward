# Changelog

## 2.0.5 · 2025-01-26

- Updated `Content-Security-Policy` to be more an allowlist instead of a blocklist.

## 2.0.4 · 2024-11-12

- Removed the `tunnel` parameter, which became unnecessary because Visual Studio Code Port Forwarding feature supports HTTPS.

## 2.0.3 · 2024-11-07

- Added the `extraGlobalOptions` parameter. See https://github.com/radically-straightforward/radically-straightforward/issues/16.

## 2.0.1 · 2024-06-06

- Fixed forwarded headers (`X-Forwarded-*`) when tunneling.

## 2.0.1 · 2024-06-06

- Added the `tunnel` option to the `application()` configuration.

## 2.0.0 · 2024-05-17

**Breaking Changes**

- Changed `address` into `hostname`.
- Changed `email` into `systemAdministratorEmail`.
- Changed `dynamicServerPorts` into `ports`.
- Changed the default for `untrustedStaticFilesRoots` from ``[`/files/* "${path.join(process.cwd(), "data")}"`]`` to `[]`.

## 1.4.3 · 2024-05-14

- Changed the headers added by Caddy such that they may be overwritten by the underlying application. This is useful if the application needs to tweak some security settings, for example, Content Security Policy (CSP).

## 1.4.2 · 2024-05-04

- Added `dataDirectory()`.

## 1.4.1 · 2024-05-03

- Changed `dynamicServerPorts`’s type from `string[]` to `number[]`.

## 1.4.0 · 2024-04-28

- Added `start()`.

## 1.3.3 · 2024-04-26

- Removed compression from `application()`, because for some reason it breaks streaming HTTP responses.

## 1.3.2 · 2024-04-09

- Added `staticFiles`.

## 1.3.1 · 2024-03-31

- Fixed the default value of `application()`’s `trustedStaticFilesRoots`.

## 1.3.0 · 2024-03-31

- Fixed the default values of `application()`’s `trustedStaticFilesRoots` and `untrustedStaticFilesRoots`.

## 1.2.0 · 2024-02-23

- In `application()`, renamed `hostname` into `address`.

## 1.1.3 · 2024-02-23

- Fixed issues with tests in previous release.

## 1.1.2 · 2024-02-23

- Added `bin` to try and fix `npx @radically-straightforward/caddy`.

## 1.1.1 · 2024-02-23

- Fixed package, which included the executable and a bunch of bundled dependencies by accident.

## 1.1.0 · 2024-02-23

- Introduce a template with a Caddy configuration for applications.
- Install Caddy via the npm `bin` mechanism, which subsumes the `postuninstall` script.
- Remove third-party dependencies to install Caddy (but introduce a dependency on `tar` being available).

## 1.0.0 · 2023-11-14

- Initial release, migrating from `@leafac/caddy`.
- Added automated tests.
- Added documentation.
