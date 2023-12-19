# Radically Straightforward · Node

**🛠️ Utilities for Node.js**

## Installation

```console
$ npm install @radically-straightforward/node
```

## Usage

```typescript
import * as node from "@radically-straightforward/node";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `isExecuted()`

```typescript
export async function isExecuted(importMetaUrl: string): Promise<boolean>;
```

Detect whether the file is being executed directly or being `import`ed into another file.

This is useful for having a single file that can provide a CLI and a JavaScript API for the same functionality.

The `importMetaUrl` parameter must always be `import.meta.url`. This parameter is necessary because `import.meta.url` is relative to the source file in which it appears.

**Example**

```javascript
import * as node from "@radically-straightforward/node";

export function doSomething() {
  console.log("Do something...");
}

if (await node.isExecuted(import.meta.url)) doSomething();
```

### `portAvailable()`

```typescript
export function portAvailable(
  port: number,
  hostname?: string,
): Promise<boolean>;
```

Detect whether binding to a port would succeed.

There may be a race condition between checking a port availability and actually binding to it. But this function is useful, for example, to provide users with more friendly error messages upfront and propose to kill the offending processes with [`kill-port`](https://npm.im/kill-port).

**References**

- https://github.com/sindresorhus/get-port/blob/85c18678143f2c673bdaf5307971397b29ddf28b/index.js#L42-L54
- https://github.com/node-modules/detect-port/blob/9804ad50f49e3256e54ac40165b16fa6c2fa8d5a/lib/detect-port.js
- https://gist.github.com/timoxley/1689041

### `time()`

```typescript
export async function time(
  title: string,
  function_: () => void | Promise<void>,
): Promise<void>;
```

Measure and report how much time it takes to run the given `function_`.

If you wish to change how reporting is done, override the `time.report: (title: string, time: bigint) => void` function, for which the `time` is provided in milliseconds.

### `elapsedTime()`

```typescript
export function elapsedTime(
  start: bigint,
  end: bigint = process.hrtime.bigint(),
): bigint;
```

Provide the `start` and `end` times in nanoseconds, as returned by `process.hrtime.bigint()`. The elapsed time is returned in milliseconds.

### `shouldTerminate()`

```typescript
export function shouldTerminate(timeout: number = 10 * 1000): Promise<void>;
```

Graceful termination. `await` for this function between the code that starts the application and the code that stops it. If the code that stops the application takes longer than `timeout` to complete, the application terminates forcefully.

> **Note:** What determines that the application should stop are the events in `shouldTerminate.events`, which include operating system signals, for example, `SIGINT` sent by `⌃C`, `SIGTERM` sent by `kill`, `SIGUSR2` sent by [`nodemon`](https://npm.im/nodemon) and so forth.

> **Note:** Some signals, for example, `SIGKILL` sent by `kill -9`, cannot be handled and cause the process to terminate immediately without the opportunity to run any more code.

> **Note:** Some of the events put the process in a state that cannot handle asynchronous functions correctly, so ideally the code that stops the application is all synchronous.

**Example**

```javascript
import express from "express";
import * as node from "@radically-straightforward/node";

const application = express();
application.get("/", (request, response) => {
  response.send("Hello world");
});
const server = application.listen(3000);
await node.shouldTerminate();
// If you comment the line below the ‘server’ doesn’t stop and the application remains running for 10 seconds, when ‘shouldTerminate()’ terminates it forcefully.
server.close();
```

<!-- DOCUMENTATION END: ./source/index.mts -->
