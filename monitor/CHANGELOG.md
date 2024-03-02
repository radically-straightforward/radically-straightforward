# Changelog

## 2.1.0 · 2024-03-02

- Send an alert when the resource is back online.
- Thread the email alerts.

## 2.0.0 · 2024-02-21

- Breaking changes to configuration file:
  - `targets` has been renamed to `resources` and its format has changed.
  - `interval` has been removed.

## 1.0.0 · 2024-01-09

- Initial released, based on https://github.com/leafac/monitor. If you’re migrating, you need to run through the setup again because the configuration format and the packaging format have changed.
