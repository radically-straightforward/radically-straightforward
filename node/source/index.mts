import childProcess from "node:child_process";
import * as utilities from "@radically-straightforward/utilities";

/**
 * `exit()` emits the `"gracefulTermination"` event. Upon this event, the application must finish operations that are in progress (for example, finish answering to HTTP requests) and empty the event loop by closing HTTP servers, clearing timeouts, and so forth. If the application is still running 10 seconds after `exit()` is called, then it’s terminated forcefully with `process.exit(1)`.
 */
export function exit(): void {
  if (exit.exiting) return;
  exit.exiting = true;
  setTimeout(() => {
    process.exit(1);
  }, 10 * 1000).unref();
  process.emit("gracefulTermination" as any);
}
exit.exiting = false;

for (const signal of [
  "SIGINT",
  "SIGQUIT",
  "SIGBREAK",
  "SIGHUP",
  "SIGTERM",
  "SIGUSR2",
])
  process.on(signal, () => {
    exit();
  });

/**
 * This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `setInterval()` which adds support for graceful termination.
 *
 * **Example**
 *
 * ```javascript
 * import timers from "node:timers/promises";
 * import * as node from "@radically-straightforward/node";
 *
 * node.setInterval({ duration: 3 * 1000 }, async () => {
 *   console.log("setInterval(): Running ‘function_’...");
 *   await timers.setTimeout(3 * 1000);
 *   console.log("setInterval(): ...finished running ‘function_’.");
 * });
 * ```
 */
export function setInterval(
  utilitiesSetIntervalOptions: Parameters<typeof utilities.setInterval>[0],
  function_: Parameters<typeof utilities.setInterval>[1],
): ReturnType<typeof utilities.setInterval> {
  const interval = utilities.setInterval(
    {
      ...utilitiesSetIntervalOptions,
      onStop: async () => {
        process.off("gracefulTermination", gracefulTerminationEventListener);
        await utilitiesSetIntervalOptions.onStop?.();
      },
    },
    function_,
  );
  const gracefulTerminationEventListener = () => {
    interval.stop();
  };
  process.once("gracefulTermination", gracefulTerminationEventListener);
  return interval;
}
process.setMaxListeners(50);

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
  setInterval(
    {
      duration: 200,
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
