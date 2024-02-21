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

---

Graceful termination. `await` for this function between the code that starts the application and the code that gracefully terminates it. If the code that gracefully terminates the application takes longer than `timeout` to complete, then the application terminates forcefully.

> **Note:** This function must be called at most once in your application.

> **Note:** What determines that the application should terminate are the `signals`, which by default include operating system signals, for example, `SIGINT` sent by `⌃C`, `SIGTERM` sent by `kill`, `SIGUSR2` sent by [`nodemon`](https://www.npmjs.com/package/nodemon), `exit` send by Node.js in the case of an uncaught exception, and so forth.

> **Note:** Some signals, for example, `SIGKILL` sent by `kill -9`, cannot be handled and cause the process to terminate immediately without the opportunity to run any more code.

**Example**

```javascript
import express from "express";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";

const application = express();
application.get("/", (request, response) => {
  response.send("Hello world");
});
const server = application.listen(3000);
const backgroundJob = utilities.backgroundJob(
  { interval: 3 * 1000 },
  async () => {
    console.log("Background job.");
  },
);
console.log("shouldTerminate(): Press ⌃C to gracefully terminate...");
await node.shouldTerminate();
console.log("shouldTerminate(): Starting graceful termination...");
// If you comment one of the lines below the application remains running for 10 seconds, when ‘shouldTerminate()’ terminates it forcefully.
server.close();
backgroundJob.stop();
```
