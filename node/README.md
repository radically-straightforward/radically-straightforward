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

### `eventLoopActive()`

```typescript
export function eventLoopActive(): Promise<void>;
```

Keep the event loop active until an operating system signal is received, even when there are no other reasons for the event loop to stay active (no network ports open, no timers, and so forth).

This is useful for starting multiple background jobs, web servers, and so forth in a single Node.js process and stop all of them gracefully when the application terminates.

**Example**

```javascript
import timers from "node:timers/promises";
import net from "node:net";
import * as node from "@radically-straightforward/node";

// Add the signal event listeners as soon as possible.
const eventLoopActive = node.eventLoopActive();

// Start background jobs.
(async () => {
  while (true) {
    console.log("Background job...");

    await timers
      // Sleep for a random amount of time to prevent the machine from being overloaded with all background jobs firing at the same time.
      .setTimeout(1000 + Math.random() * 1000, undefined, {
        // Don’t keep a reference to the timer, because the event loop will be kept alive by `eventLoopActive` and we want the event loop to **give up** on the background job when it’s time to terminate.
        ref: false,
      })
      .catch(() => {});
  }
})();

// Start server.
const server = net.createServer();
server.listen(8000);
console.log("Server listening on port 8000 and waiting for signal...");

// Wait for signal.
await eventLoopActive;

// Cleanup.
server.close();
console.log("Server closed.");
```

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

<!-- DOCUMENTATION END: ./source/index.mts -->
