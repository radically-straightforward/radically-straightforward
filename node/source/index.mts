import childProcess from "node:child_process";
import * as utilities from "@radically-straightforward/utilities";

process.setMaxListeners(50);
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
 * This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `backgroundJob()` which adds support for graceful termination.
 *
 * **Example**
 *
 * ```javascript
 * import timers from "node:timers/promises";
 * import * as node from "@radically-straightforward/node";
 *
 * node.backgroundJob({ interval: 3 * 1000 }, async () => {
 *   console.log("backgroundJob(): Running background job...");
 *   await timers.setTimeout(3 * 1000);
 *   console.log("backgroundJob(): ...finished running background job.");
 * });
 * ```
 */
export function backgroundJob(
  {
    onStop,
    ...utilitiesBackgroundJobOptions
  }: Parameters<typeof utilities.backgroundJob>[0],
  job: Parameters<typeof utilities.backgroundJob>[1],
): ReturnType<typeof utilities.backgroundJob> {
  const backgroundJob = utilities.backgroundJob(
    {
      ...utilitiesBackgroundJobOptions,
      onStop: async () => {
        process.off("gracefulTermination", gracefulTerminationEventListener);
        await onStop?.();
      },
    },
    job,
  );
  const gracefulTerminationEventListener = () => {
    backgroundJob.stop();
  };
  process.once("gracefulTermination", gracefulTerminationEventListener);
  return backgroundJob;
}

/**
 * Keep a child process alive. If the child process crashes, respawn it. When the process gracefully terminates, gracefully terminate the child process as well.
 *
 * **Example**
 *
 * ```typescript
 * node.childProcessKeepAlive(() =>
 *   childProcess.spawn("node", ["--eval", `http.createServer().listen(18000)`], {
 *     stdio: "inherit",
 *   }),
 * );
 * ```
 */
export function childProcessKeepAlive(
  newChildProcess: () =>
    | ReturnType<(typeof childProcess)["spawn"]>
    | Promise<ReturnType<(typeof childProcess)["spawn"]>>,
): void {
  let childProcessInstance: ReturnType<(typeof childProcess)["spawn"]>;
  backgroundJob(
    {
      interval: 200,
      onStop: () => {
        childProcessInstance.kill();
      },
    },
    async () => {
      childProcessInstance = await newChildProcess();
      await new Promise((resolve) => {
        childProcessInstance.once("close", resolve);
      });
    },
  );
}

/**
 * On platforms other than Windows, `exit()` sends a `SIGTERM` to the process itself, which starts graceful termination. On Windows, this `process.emit()`s the `gracefulTermination` event and `process.exit()`s.
 */
export function exit(): void {
  if (process.platform === "win32") {
    process.emit("gracefulTermination" as any);
    process.exit();
  } else process.kill(process.pid);
}
