import test from "node:test";
import express from "express";
import * as node from "./index.mjs";

test(
  "shouldTerminate()",
  {
    ...(!process.stdin.isTTY
      ? {
          skip: "Run interactive test with ‘node ./build/index.test.mjs’.",
        }
      : {}),
  },
  async () => {
    const application = express();
    application.get("/", (request, response) => {
      response.send("Hello world");
    });
    const server = application.listen(3000);
    console.log("shouldTerminate(): Press ⌃C to gracefully terminate...");
    await node.shouldTerminate();
    console.log("shouldTerminate(): Starting graceful termination...");
    // If you comment the line below the ‘server’ doesn’t stop and the application remains running for 10 seconds, when ‘shouldTerminate()’ terminates it forcefully.
    server.close();
  },
);
