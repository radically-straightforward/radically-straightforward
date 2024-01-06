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

<!-- DOCUMENTATION START: ./source/index.mts -->

### `shouldTerminate()`

```typescript
export function shouldTerminate({
  events = [
    "exit",
    "SIGHUP",
    "SIGINT",
    "SIGQUIT",
    "SIGTERM",
    "SIGUSR2",
    "SIGBREAK",
  ],
  timeout = 10 * 1000,
  forcefulTerminationExitCode = 1,
}: {
  events?: string[];
  timeout?: number;
  forcefulTerminationExitCode?: number;
} = {}): Promise<void>;
```

Graceful termination. `await` for this function between the code that starts the application and the code that gracefully terminates it. If the code that gracefully terminates the application takes longer than `timeout` to complete, then the application terminates forcefully.

> **Note:** This function must be called at most once in your application.

> **Note:** What determines that the application should terminate are the `events`, which by default include operating system signals, for example, `SIGINT` sent by `⌃C`, `SIGTERM` sent by `kill`, `SIGUSR2` sent by [`nodemon`](https://npm.im/nodemon), `exit` send by Node.js in the case of an uncaught exception, and so forth.

> **Note:** Some signals, for example, `SIGKILL` sent by `kill -9`, cannot be handled and cause the process to terminate immediately without the opportunity to run any more code.

> **Note:** Some of the events put the process in a state that cannot handle asynchronous functions, so the code that terminates the application should be synchronous.

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
