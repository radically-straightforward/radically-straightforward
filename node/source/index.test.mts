import test from "node:test";
import http from "node:http";
import "@radically-straightforward/node";

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
