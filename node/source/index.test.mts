import test from "node:test";
import http from "node:http";
import timers from "node:timers/promises";
import childProcess from "node:child_process";
import sql, { Database } from "@radically-straightforward/sqlite";
import server from "@radically-straightforward/server";
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
  "BackgroundJobs",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "BackgroundJobs"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "BackgroundJobs"’.`,
  },
  async () => {
    const database = await new Database(":memory:").migrate();
    const backgroundJobs = new node.BackgroundJobs(database, server());

    backgroundJobs.add({ type: "a-job-with-no-worker" });

    database.run(sql`
      INSERT INTO "_backgroundJobs" (
        "type",
        "startAt",
        "startedAt",
        "retries",
        "parameters"
      )
      VALUES (
        ${"a-job-which-was-left-behind"},
        ${new Date(Date.now() - 20 * 60 * 1000).toISOString()},
        ${new Date(Date.now() - 15 * 60 * 1000).toISOString()},
        ${0},
        ${JSON.stringify(null)}
      )
    `);
    backgroundJobs.worker(
      {
        type: "a-job-which-was-left-behind",
        interval: 10 * 60 * 1000,
      },
      () => {},
    );

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    backgroundJobs.worker(
      {
        type: "a-job-which-times-out",
        interval: 1000,
        timeout: 1000,
        retryIn: 1000,
        retries: 2,
      },
      async () => {
        await timers.setTimeout(5000);
      },
    );
    backgroundJobs.add({
      type: "a-job-which-times-out",
      parameters: { name: "Leandro" },
    });

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    backgroundJobs.worker(
      {
        type: "a-job-which-throws-an-exception",
        interval: 1000,
        timeout: 1000,
        retryIn: 1000,
        retries: 2,
      },
      async () => {
        throw new Error("AN ERROR");
      },
    );
    backgroundJobs.add({
      type: "a-job-which-throws-an-exception",
      parameters: { name: "Leandro" },
    });

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    backgroundJobs.worker(
      {
        type: "a-job-which-is-forced-into-execution",
        interval: 10 * 60 * 1000,
      },
      () => {},
    );
    backgroundJobs.add({
      type: "a-job-which-is-forced-into-execution",
      parameters: { name: "Leandro" },
    });

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    await fetch("http://localhost:18000/a-job-which-is-forced-into-execution", {
      method: "POST",
      headers: { "CSRF-Protection": "true" },
    });

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    if (process.platform === "win32") process.exit();
    else process.kill(process.pid);
  },
);
