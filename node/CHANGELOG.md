# Changelog

## Unreleased

- **Breaking Change:** `eventLoopActive()` has been replaced with `shouldTerminate()`, which not only listens to events that should cause the application to stop, but also terminates the application forcefully if it doesn’t terminate gracefully within a timeout.

## 1.0.0 · 2023-11-21

- Initial release, based on [`@leafac/node`](https://npm.im/@leafac/node).
