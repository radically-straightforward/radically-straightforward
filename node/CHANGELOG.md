# Changelog

## 2.0.1 · 2024-01-06

- `shouldTerminate()`: Added the option of specifying a `forcefulTerminationExitCode`.

## 2.0.0 · 2024-01-04

- **Breaking Change:** `eventLoopActive()` has been replaced with `shouldTerminate()`, which not only listens to events that should cause the application to stop, but also terminates the application forcefully if it doesn’t terminate gracefully within a timeout.
- **Breaking Change:** Removed the `time()` and `elapsedTime()` functions. Use [`console.time()` and `console.timeEnd()`](https://nodejs.org/dist/latest-v21.x/docs/api/console.html#consoletimelabel) instead.
- **Breaking Change:** Removed `isExecuted()`. Use a separate file for the executable part of your application instead. Also, see https://github.com/nodejs/node/issues/49440.
- **Breaking Change:** Removed `portAvailable()`. By construction there has always been a race condition in the way this function would have been used. It’s better to try and bind to the port and report the issues gracefully.

## 1.0.0 · 2023-11-21

- Initial release, based on [`@leafac/node`](https://npm.im/@leafac/node).
