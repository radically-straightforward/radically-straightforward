# Radically Straightforward · Node

**🔨 Utilities for Node.js**

## Installation

```console
$ npm install @radically-straightforward/node
```

## Usage

```typescript
import "@radically-straightforward/node";
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

> **Note:** The `"gracefulTermination"` signal is emitted only once.

As one last step before termination, you may handle [Node.js’s `process.once("beforeExit")` event](https://nodejs.org/api/process.html#event-beforeexit), which is emitted after the Node.js event loop is empty, but before the application terminates. This is useful, for example, to close a database connection, to log that the application terminated gracefully, and so forth.

> **Note:** You may wish to close a database connection on `"beforeExit"` instead of `"gracefulTermination"` because during `"gracefulTermination"` an HTTP server may still need the database connection while it’s responding to the last undergoing requests before closing.

> **Note:** According to Node.js’s documentation you may use `"beforeExit"` to add more work to the event loop and prevent the process from terminating, but we advise against using it that way.

> **Note:** Use the `"beforeExit"` event instead of the [`"exit"` event](https://nodejs.org/api/process.html#event-exit) for the following reasons:
>
> 1. The `"exit"` event handler runs in a constrained environment that only allows for synchronous operations, but your cleanup may need to be asynchronous.
> 2. The `"exit"` event is emitted even when the process is terminating in abnormal conditions, for example, because of an uncaught exception, and under these abnormal conditions graceful termination isn’t appropriate.

After the `"gracefulTermination"` event is emitted, if the application doesn’t terminate in 10 seconds, then it’s terminated forcefully with `process.exit(1)`.

**Example**

```typescript
import http from "node:http";
import "@radically-straightforward/node";

const server = http
  .createServer((request, response) => {
    response.end("gracefulTermination");
  })
  .listen(8000);
process.once("gracefulTermination", () => {
  // If you comment the line below the application remains running for 10 seconds and then it is forcefully terminated.
  server.close();
});

console.log("gracefulTermination: Press ⌃C to gracefully terminate...");
process.once("gracefulTermination", () => {
  console.log("gracefulTermination: Starting graceful termination...");
});
process.once("beforeExit", () => {
  console.log("gracefulTermination: Succeeded.");
});
```
