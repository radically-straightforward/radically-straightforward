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

<!-- DOCUMENTATION START: ./source/index.mts -->

### `backgroundJob()`

```typescript
export function backgroundJob(
  {
    onStop,
    ...utilitiesBackgroundJobOptions
  }: Parameters<typeof utilities.backgroundJob>[0],
  job: Parameters<typeof utilities.backgroundJob>[1],
): ReturnType<typeof utilities.backgroundJob>;
```

This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `backgroundJob()` which adds support for graceful termination.

**Example**

```javascript
import timers from "node:timers/promises";
import * as node from "@radically-straightforward/node";

node.backgroundJob({ interval: 3 * 1000 }, async () => {
  console.log("backgroundJob(): Running background job...");
  await timers.setTimeout(3 * 1000);
  console.log("backgroundJob(): ...finished running background job.");
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

### `BackgroundJobs`

```typescript
export class BackgroundJobs;
```

A background job system that builds upon `backgroundJob()` to provide the following features:

- Allow jobs to be worked on by multiple Node.js processes.

- Persist background jobs so that they are run even if the process crashes.

- Impose a timeout on jobs.

- Retry jobs that failed.

- Schedule jobs to run in the future.

- Log the progress of a job throughout the system.

- Allow a job to be forced to run as soon as possible, even across processes. This is useful, for example, in a web application that sends emails in a background job (because sending emails would otherwise slow down the request-response cycle), but needs to send a “Password Reset” email as soon as possible. Inter-process communication is available through an HTTP server that listens on `localhost`.

**References**

- https://github.com/collectiveidea/delayed_job
- https://github.com/betterment/delayed
- https://github.com/bensheldon/good_job
- https://github.com/litements/litequeue
- https://github.com/diamondio/better-queue-sqlite

#### `BackgroundJobs.constructor()`

```typescript
constructor(database: Database, server?: serverTypes.Server);
```

- **`database`:** A [`@radically-straightforward/sqlite`](https://github.com/radically-straightforward/radically-straightforward/tree/main/sqlite) database that stores the background jobs. You may use the same database as your application data, which is simpler to manage, or a separate database for background jobs, which may be faster because background jobs write to the database often and SQLite locks the database on writes.

- **`server`:** A [`@radically-straightforward/server`](https://github.com/radically-straightforward/radically-straightforward/tree/main/server) that, if provided, makes available endpoints that forces jobs to run as soon as possible. For example, a job of type `email` may be forced to run as soon as possible with the following request:

  ```javascript
  await fetch("http://localhost:18000/email", {
    method: "POST",
    headers: { "CSRF-Protection": "true" },
  });
  ```

#### `BackgroundJobs.add()`

```typescript
add({
    type,
    startIn = 0,
    parameters = null,
  }: {
    type: string;
    startIn?: number;
    parameters?: Parameters<typeof JSON.stringify>[0];
  }): void;
```

Add a job to be worked on.

- **`startIn`:** Schedule a job to be run in the future.

- **`parameters`:** Optional parameters that are serialized as JSON and then provided to the worker.

#### `BackgroundJobs.worker()`

```typescript
worker<Type>(
    {
      type,
      timeout = 10 * 60 * 1000,
      retryIn = 5 * 60 * 1000,
      retries = 10,
      ...nodeBackgroundJobOptions
    }: {
      type: string;
      timeout?: number;
      retryIn?: number;
      retries?: number;
    } & Parameters<typeof backgroundJob>[0],
    job: (parameters: Type) => void | Promise<void>,
  ): ReturnType<typeof backgroundJob>;
```

Define a worker for a given `type` of job.

- **`interval`:** How often the worker polls the database for new jobs. Don’t make this number too small—if you need a job to run without delay, use the web server to force a worker to execute as soon as possible.

- **`timeout`:** How long a job may run for before it’s considered timed out. There are two kinds of timeouts:

  - **Internal Timeout:** The job was initiated and didn’t finish on time. Note that in this case the job may actually end up running to completion, despite being marked for retrying in the future. This is a consequence of using [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `timeout()`.

  - **External Timeout:** A job was found in the database with a starting date that is too old. This may happen because a process crashed while working on the job without the opportunity to clean things up.

- **`retryIn`:** How long to wait for before retrying a job that threw an exception.

- **`retries`:** How many times to retry a job before considering it failed.

<!-- DOCUMENTATION END: ./source/index.mts -->
