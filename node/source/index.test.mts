import test from "node:test";
import http from "node:http";
import timers from "node:timers/promises";
import childProcess from "node:child_process";
import * as node from "@radically-straightforward/node";

test(
  "gracefulTermination",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "gracefulTermination"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "gracefulTermination"’.`,
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
    skip:
      process.stdin.isTTY && process.argv[2] === "backgroundJob()"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "backgroundJob()"’.`,
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
    console.log("backgroundJob(): Press ⌃Z to ‘run()’ and ⌃C to ‘stop()’...");
  },
);

test(
  "childProcessKeepAlive()",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "childProcessKeepAlive()"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "childProcessKeepAlive()"’.`,
  },
  async () => {
    node.childProcessKeepAlive(() => {
      const childProcessInstance = childProcess.spawn(
        "node",
        ["--eval", `http.createServer().listen(18000)`],
        { stdio: "inherit" },
      );
      console.log(
        `childProcessKeepAlive(): Child process id: ${childProcessInstance.pid}`,
      );
      return childProcessInstance;
    });
  },
);

test(
  "exit()",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "exit()"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "exit()"’.`,
  },
  async () => {
    node.exit();
  },
);
