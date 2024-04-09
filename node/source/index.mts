import * as utilities from "@radically-straightforward/utilities";

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
