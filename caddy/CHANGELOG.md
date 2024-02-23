# Changelog

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
