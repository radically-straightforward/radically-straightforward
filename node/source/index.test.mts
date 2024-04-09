import test from "node:test";
import http from "node:http";
import timers from "node:timers/promises";
import * as node from "@radically-straightforward/node";

test(
  "gracefulTermination",
  {
    skip: process.stdin.isTTY
      ? false
      : "Run interactive test with ‘node ./build/index.test.mjs’.",
  },
  async () => {
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
  },
);

test(
  "backgroundJob()",
  {
    skip: process.stdin.isTTY
      ? false
      : "Run interactive test with ‘node ./build/index.test.mjs’.",
  },
  async () => {
    for (let iteration = 0; iteration < 1000; iteration++) {
      const backgroundJob = node.backgroundJob(
        { interval: 3 * 1000 },
        () => {},
      );
      backgroundJob.stop();
      // If background jobs leak ‘process.once("gracefulTermination")’ event listeners, then we get a warning in the console.
    }

    const backgroundJob = node.backgroundJob(
      { interval: 3 * 1000 },
      async () => {
        console.log("backgroundJob(): Running background job...");
        await timers.setTimeout(3 * 1000);
        console.log("backgroundJob(): ...finished running background job.");
      },
    );
    process.on("SIGTSTP", () => {
      backgroundJob.run();
    });
    console.log(
      "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to gracefully terminate...",
    );
  },
);
