# Radically Straightforward · Node

**🔨 Utilities for Node.js**

## Installation

```console
$ npm install @radically-straightforward/node
```

## Usage

```typescript
import * as node from "@radically-straightforward/node";
```

### Graceful Termination

Importing `@radically-straightforward/node` enables graceful termination, which gives your application the opportunity to clean up resources before exiting.

Graceful termination works by listening to the following signals:

- `SIGINT`: Emitted by pressing `⌃C` on the terminal.
- `SIGQUIT`: Emitted by pressing `⌃\` on the terminal.
- `SIGBREAK`: Emitted by pressing `Ctrl+Break` on the terminal **on Windows**.
- `SIGHUP`: Emitted when the terminal is closed while the application is still running.
- `SIGTERM`: Emitted by process managers that wish to terminate the application, for example, `systemd`, `kill`, and so forth.
- `SIGUSR2`: Emitted by [nodemon](https://www.npmjs.com/package/nodemon) to indicate that the application should restart.

> **Note:** Some signals, for example, `SIGKILL`, which may be sent by `kill -9`, cannot be handled and cause the process to terminate immediately without the opportunity to clean up resources.

When one of these signals is received, the `process.once("gracefulTermination")` event is emitted, and your application should handle it to [close HTTP servers](https://nodejs.org/api/http.html#serverclosecallback), [clear timers](https://nodejs.org/api/timers.html#clearimmediateimmediate), and so forth. The goal is to leave the Node.js event loop empty so that the process may terminate naturally.

> **Note:** The `"gracefulTermination"` event is emitted only once.

As one last step before termination, you may handle [Node.js’s `process.once("beforeExit")` event](https://nodejs.org/api/process.html#event-beforeexit), which is emitted after the Node.js event loop is empty, but before the application terminates. This is useful, for example, to close a database connection, to log that the application terminated gracefully, and so forth.

> **Note:** You may wish to close a database connection on `"beforeExit"` instead of `"gracefulTermination"` because during `"gracefulTermination"` an HTTP server may still need the database connection while it’s responding to the last undergoing requests before closing.

> **Note:** According to Node.js’s documentation you may use `"beforeExit"` to add more work to the event loop and prevent the process from terminating, but we advise against using it that way.

> **Note:** Use the `"beforeExit"` event instead of the [`"exit"` event](https://nodejs.org/api/process.html#event-exit) for the following reasons:
>
> 1. The `"exit"` event handler runs in a constrained environment that only allows for synchronous operations, but your cleanup may need to be asynchronous.
> 2. The `"exit"` event is emitted even when the process is terminating in abnormal conditions, for example, because of an uncaught exception, and under these abnormal conditions graceful termination isn’t appropriate.

After the `"gracefulTermination"` event is emitted, if the application doesn’t terminate in 10 seconds, then it’s terminated forcefully with `process.exit(1)`.

<!-- DOCUMENTATION START: ./source/index.mts -->

### `exit()`

```typescript
export function exit(): void;
```

`exit()` emits the `"gracefulTermination"` event. Upon this event, the application must finish operations that are in progress (for example, finish answering to HTTP requests) and empty the event loop by closing HTTP servers, clearing timeouts, and so forth. If the application is still running 10 seconds after `exit()` is called, then it’s terminated forcefully with `process.exit(1)`.

### `setInterval()`

```typescript
export function setInterval(
  utilitiesSetIntervalOptions: Parameters<typeof utilities.setInterval>[0],
  function_: Parameters<typeof utilities.setInterval>[1],
): ReturnType<typeof utilities.setInterval>;
```

This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `setInterval()` which adds support for graceful termination.

**Example**

```javascript
import timers from "node:timers/promises";
import * as node from "@radically-straightforward/node";

node.setInterval({ duration: 3 * 1000 }, async () => {
  console.log("setInterval(): Running ‘function_’...");
  await timers.setTimeout(3 * 1000);
  console.log("setInterval(): ...finished running ‘function_’.");
});
```

### `childProcessKeepAlive()`

```typescript
export function childProcessKeepAlive(
  newChildProcess: () =>
    | ReturnType<(typeof childProcess)["spawn"]>
    | Promise<ReturnType<(typeof childProcess)["spawn"]>>,
): void;
```

Keep a child process alive. If the child process crashes, respawn it. When the process gracefully terminates, gracefully terminate the child process as well.

**Example**

```typescript
node.childProcessKeepAlive(() =>
  childProcess.spawn("node", ["--eval", `http.createServer().listen(18000)`], {
    stdio: "inherit",
  }),
);
```

<!-- DOCUMENTATION END: ./source/index.mts -->
