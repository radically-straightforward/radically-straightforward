# Changelog

## 2.0.17 · 2025-10-29

- Added `Cache`.

## 2.0.11 · 2025-10-26

- On `foregroundJob()`, make it so that you can `await` for the job to stop running/rerunning even when this is a subsequent call that will set the state to `"runningAndMarkedForRerun"`.

## 2.0.10 · 2025-10-24

- On `foregroundJob()`, make it so that you can `await` for the job to stop running/rerunning.

## 2.0.9 · 2025-10-03

- On `snippet()`, fix the `prefix` parameter.

## 2.0.8 · 2025-03-13

- On `highlight()`, add the `prefix` parameter.

## 2.0.7 · 2024-10-18

- Added `tokenize()`, `normalizeToken()`, `highlight()`, and `snippet()`.

## 2.0.6 · 2024-07-12

- Added `dedent()`.

## 2.0.5 · 2024-06-08

- Added `foregroundJob()`.

## 2.0.4 · 2024-06-04

- Changed `emailRegExp` to allow `=` before the `@`.

## 2.0.3 · 2024-05-01

- Added documentation for `timeout()`.

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
