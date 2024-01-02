/**
    - Remove uses of `node:timers/promises`?
 * 
 * TODO: In universal JavaScript, implement a way to **canonicalize** objects using deepEquals to be used in Sets and as Map keys (then deprecate `collections-deep-equal`).
 *   - value objects
 *   - https://lodash.com/docs/4.17.15#isEqual
 * TODO: Implement using setTimeout and let it be usable in client-side JavaScript as well.
 * TODO: Explain the differences between this and `setInterval()` (wait for completion before setting the next scheduler, and force a job to run)
 * 
 * Start a background job that runs every given `interval`.
 *
 * You may use `backgroundJob.run()` to force the background job to run right away.
 *
 * **Note:** If a background job is running when `backgroundJob.continue()` is called.
 *
 * You may use `backgroundJob.stop()` to stop the background job.
 *
 * **Note:** If a background job is running when `backgroundJob.stop()` is called, then that background job is run to completion, but a future background job run is not scheduled. This is similar to how an HTTP server may stop  finish processing existing requests but don’t accept new requests.
 *
 * **Note:** The `intervalVariance` prevents many background jobs from starting at the same and overloading the machine.
 *
 * **Example**
 *
 * ```javascript
 * import * as node from "@radically-straightforward/node";
 *
 * const backgroundJob = node.backgroundJob({ interval: 3 * 1000 }, () => {
 *   console.log("backgroundJob(): Running background job...");
 * });
 * process.on("SIGTSTP", () => {
 *   backgroundJob.run();
 * });
 * console.log(
 *   "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to continue...",
 * );
 * await node.shouldTerminate();
 * backgroundJob.stop();
 * ```
 */
export function backgroundJob(
  {
    interval,
    intervalVariance = 0.1,
  }: { interval: number; intervalVariance?: number },
  function_: () => void | Promise<void>,
): { run: () => void; stop: () => void } {
  let shouldContinue = true;
  let abortController = new AbortController();
  (async () => {
    while (shouldContinue) {
      await function_();
      await timers
        .setTimeout(
          interval + interval * intervalVariance * Math.random(),
          undefined,
          { signal: abortController.signal },
        )
        .catch(() => {});
      abortController = new AbortController();
    }
  })();
  return {
    run: () => {
      abortController.abort();
    },
    stop: () => {
      shouldContinue = false;
      abortController.abort();
    },
  };
}

