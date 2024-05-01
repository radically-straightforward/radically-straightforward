# Changelog

## 2.0.2 · 2024-05-01

- Added `timeout()`.

## 2.0.1 · 2024-04-26

- `backgroundJob()` doesn’t stop when the job throws an exception.

## 2.0.0 · 2024-04-09

- **Breaking Change:** Made `@radically-straightforward/utilities` truly independent of platform by extracting the Node.js especial treatment into `@radically-straightforward/node`.

## 1.2.2 · 2024-04-01

- Added:
  - `capitalize()`
  - `isDate()`
  - `emailRegExp`
  - `ISODateRegExp`
  - `localizedDateRegExp`

## 1.2.1 · 2024-03-12

- Changed `backgroundJob()` so that in Node.js it doesn’t leak `process.once.("gracefulTermination")` event listeners to terminate gracefully.

## 1.2.0 · 2024-03-07

- Added `JSONLinesTransformStream`.

## 1.1.1 · 2024-02-21

- Added date to `log()`.

## 1.1.0 · 2024-02-21

- Changed `backgroundJob()` so that in Node.js it terminates gracefully.

## 1.0.1 · 2024-01-09

- Added `log()`.

## 1.0.0 · 2024-01-06

- Added `backgroundJob()`.
- Added `sleep()`.
- Added `randomString()`.

## 0.0.3 · 2024-01-05

- Made `intern()` more strict in terms of types and provide auxiliary types for it.

## 0.0.2 · 2024-01-05

- **Breaking Change:** Modified `intern()` to be shallow, which may be easier to reason about and faster.

## 0.0.1 · 2024-01-04

- Preliminary release with `intern()`.
