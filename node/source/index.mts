let gracefulTerminationEmitted = false;
for (const signal of [
  "SIGINT",
  "SIGQUIT",
  "SIGBREAK",
  "SIGHUP",
  "SIGTERM",
  "SIGUSR2",
])
  process.on(signal, () => {
    if (gracefulTerminationEmitted) return;
    gracefulTerminationEmitted = true;
    setTimeout(() => {
      process.exit(1);
    }, 10 * 1000).unref();
    process.emit("gracefulTermination" as any);
  });

/**
 * 5. In Node.js the background job is stopped on [`"gracefulTermination"`](https://github.com/radically-straightforward/radically-straightforward/tree/main/node#graceful-termination).
 * 
 *  * **Example**
 *
 * ```javascript
 * import * as utilities from "@radically-straightforward/utilities";
 *
 * const backgroundJob = utilities.backgroundJob(
 *   { interval: 3 * 1000 },
 *   async () => {
 *     console.log("backgroundJob(): Running background job...");
 *     await utilities.sleep(3 * 1000);
 *     console.log("backgroundJob(): ...finished running background job.");
 *   },
 * );
 * process.on("SIGTSTP", () => {
 *   backgroundJob.run();
 * });
 * console.log(
 *   "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to continue...",
 * );
 * ```
 */
export function backgroundJob(
  {
    interval,
    intervalVariance = 0.1,
  }: { interval: number; intervalVariance?: number },
  job: () => void | Promise<void>,
): { run: () => void; stop: () => void } {
  let state: "sleeping" | "running" | "runningAndMarkedForRerun" | "stopped" =
    "sleeping";
  let timeout: any = undefined;
  const scheduler = {
    run: async () => {
      switch (state) {
        case "sleeping":
          clearTimeout(timeout);
          state = "running";
          await job();
          if (state === "running" || state === "runningAndMarkedForRerun") {
            timeout = setTimeout(
              () => {
                scheduler.run();
              },
              (state as any) === "runningAndMarkedForRerun"
                ? 0
                : interval + interval * intervalVariance * Math.random(),
            );
            state = "sleeping";
          }
          break;
        case "running":
          state = "runningAndMarkedForRerun";
          break;
      }
    },
    stop: () => {
      clearTimeout(timeout);
      state = "stopped";
      process?.off?.("gracefulTermination", gracefulTerminationEventListener);
    },
  };
  scheduler.run();
  const gracefulTerminationEventListener = () => {
    scheduler.stop();
  };
  process?.once?.("gracefulTermination", gracefulTerminationEventListener);
  return scheduler;
}

test(
  "backgroundJob()",
  {
    skip: process.stdin.isTTY
      ? false
      : "Run interactive test with ‘node ./build/index.test.mjs’.",
  },
  async () => {
    for (let iteration = 0; iteration < 1000; iteration++) {
      const backgroundJob = utilities.backgroundJob(
        { interval: 3 * 1000 },
        () => {},
      );
      backgroundJob.stop();
      // If background jobs leak ‘process.once("gracefulTermination")’ event listeners, then we get a warning in the console.
    }

    const backgroundJob = utilities.backgroundJob(
      { interval: 3 * 1000 },
      async () => {
        console.log("backgroundJob(): Running background job...");
        await utilities.sleep(3 * 1000);
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
