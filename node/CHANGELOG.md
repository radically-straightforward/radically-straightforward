# Changelog

## 3.1.3 · 2024-05-01

- Added `BackgroundJobs`.

## 3.1.2 · 2024-04-28

- Added `childProcessKeepAlive()`.

## 3.1.1 · 2024-04-26

- Update `@radically-straightforward/utilities`, which adds support for background jobs that throw an exception.

## 3.1.0 · 2024-04-09

- Added `backgroundJob()`.

## 3.0.0 · 2024-02-21

- Replaced `shouldTerminate()` with the `process.once("gracefulTermination")` event.

## 2.0.1 · 2024-01-06

- `shouldTerminate()`: Added the option of specifying a `forcefulTerminationExitCode`.

## 2.0.0 · 2024-01-04

- **Breaking Change:** `eventLoopActive()` has been replaced with `shouldTerminate()`, which not only listens to events that should cause the application to stop, but also terminates the application forcefully if it doesn’t terminate gracefully within a timeout.
- **Breaking Change:** Removed the `time()` and `elapsedTime()` functions. Use [`console.time()` and `console.timeEnd()`](https://nodejs.org/api/console.html#consoletimelabel) instead.
- **Breaking Change:** Removed `isExecuted()`. Use a separate file for the executable part of your application instead. Also, see https://github.com/nodejs/node/issues/49440.
- **Breaking Change:** Removed `portAvailable()`. By construction there has always been a race condition in the way this function would have been used. It’s better to try and bind to the port and report the issues gracefully.

## 1.0.0 · 2023-11-21

- Initial release, based on [`@leafac/node`](https://www.npmjs.com/package/@leafac/node).
