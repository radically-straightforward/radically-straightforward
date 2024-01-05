/**
 * [Interning](<https://en.wikipedia.org/wiki/Interning_(computer_science)>) a value makes it unique across the program, which is useful for checking equality with `===` (reference equality), using it as a key in a `Map`, adding it to a `Set`, and so forth:
 *
 * ```javascript
 * import { intern as $ } from "@radically-straightforward/utilities";
 *
 * [1] === [1]; // => false
 * $([1]) === $([1]); // => true
 *
 * {
 *   const map = new Map();
 *   map.set([1], 1);
 *   map.set([1], 2);
 *   map.size; // => 2
 *   map.get([1]); // => undefined
 * }
 *
 * {
 *   const map = new Map();
 *   map.set($([1]), 1);
 *   map.set($([1]), 2);
 *   map.size; // => 1
 *   map.get($([1])); // => 2
 * }
 *
 * {
 *   const set = new Set();
 *   set.add([1]);
 *   set.add([1]);
 *   set.size; // => 2
 *   set.has([1]); // => false
 * }
 *
 * {
 *   const set = new Set();
 *   set.add($([1]));
 *   set.add($([1]));
 *   set.size; // => 1
 *   set.has($([1])); // => true
 * }
 * ```
 *
 * > **Note:** We recommend that you alias `intern as $` when importing it to make your code less noisy.
 *
 * > **Node:** Inner values must be either primitives or interned values themselves, for example, `$([1, $({})])` is valid, but `$([1, {}])` is not.
 *
 * > **Node:** Currently only arrays (tuples) and objects (records) may be interned. In the future we may support more types, for example, `Map`, `Set`, regular expressions, and so forth.
 *
 * > **Note:** You must not mutate an interned value. Interned values are [frozen](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) to prevent mutation.
 *
 * > **Note:** Interning a value is a costly operation which grows more expensive as you intern more values. Only intern values when really necessary.
 *
 * > **Note:** The pool of interned values is available as `intern.pool`. There’s a `FinalizationRegistry` at `intern.finalizationRegistry` that cleans up interned values that have been garbage collected.
 *
 * **Related Work**
 *
 * **[JavaScript Records & Tuples Proposal](https://github.com/tc39/proposal-record-tuple)**
 *
 * A proposal to include immutable objects (Records) and immutable arrays (Tuples) in JavaScript. This subsumes most of the need for `intern()`.
 *
 * It includes a [polyfill](https://github.com/bloomberg/record-tuple-polyfill) which works very similarly to `intern()` but requires different functions for different data types.
 *
 * **[`collections-deep-equal`](https://npm.im/collections-deep-equal)**
 *
 * A previous solution to this problem which took a different approach: Instead of interning the values and allowing you to use JavaScript’s `Map`s and `Set`s, `collections-deep-equal` extends `Map`s and `Set`s with a different notion of equality.
 *
 * `collections-deep-equal` doesn’t address the issue of comparing values with `===` (reference equality).
 *
 * `collections-deep-equal` does more work on every manipulation of the data structure, for example, when looking up a key in a `Map`, so it may be slower.
 *
 * `collections-deep-equal` has different intern pools for each `Map` and `Set` instead of `intern()`’s single global intern pool, which may be advantageous because smaller pools may be faster to traverse.
 *
 * **[Immutable.js](https://npm.im/immutable), [`collections`](https://npm.im/collections), [`mori`](https://npm.im/mori), [TypeScript Collections](https://npm.im/typescript-collections), [`prelude-ts`](https://npm.im/prelude-ts), [`collectable`](https://npm.im/collectable), and so forth**
 *
 * Similar to `collections-deep-equal`, these libraries implement their own data structures instead of relying on JavaScript’s `Map`s and `Set`s. Some of them go a step further and add their own notions of objects and arrays, which requires you to convert your values back and forth, may not show up nicely in the JavaScript inspector, may be less ergonomic to use with TypeScript, and so forth.
 *
 * The advantage of these libraries over interning is that they may be faster.
 *
 * **[`immer`](https://npm.im/immer) and [`icepick`](https://npm.im/icepick)**
 *
 * Introduce a new way to create values based on existing values.
 *
 * **[`seamless-immutable`](https://npm.im/seamless-immutable)**
 *
 * Modifies existing values more profoundly than freezing.
 *
 * **[`es6-array-map`](https://npm.im/es6-array-map), [`valuecollection`](https://npm.im/valuecollection), [`@strong-roots-capital/map-objects`](https://npm.im/@strong-roots-capital/map-objects), and so forth**
 *
 * Similar to `collections-deep-equal` but either incomplete, or lacking type definitions, and so forth.
 *
 * **Other**
 *
 * - <https://2ality.com/2015/01/es6-maps-sets.html#why-can’t-i-configure-how-maps-and-sets-compare-keys-and-values%3F>
 * - <https://stackoverflow.com/questions/21838436/map-using-tuples-or-objects>
 * - <https://esdiscuss.org/topic/maps-with-object-keys>
 * - <https://medium.com/@modernserf/the-tyranny-of-triple-equals-de46cc0c5723>
 * - <https://medium.com/@modernserf/the-tyranny-of-triple-equals-de46cc0c5723>
 * - <https://twitter.com/swannodette/status/1067962983924539392>
 * - <https://gist.github.com/modernserf/c000e62d40f678cf395e3f360b9b0e43>
 */
export function intern<T extends Array<unknown> | { [key: string]: unknown }>(
  value: T,
): T {
  const type = Array.isArray(value)
    ? "tuple"
    : typeof value === "object" && value !== null
      ? "record"
      : (() => {
          throw new Error(`Failed to intern value.`);
        })();
  const keys = Object.keys(value);
  for (const internWeakRef of intern.pools[type].values()) {
    const internValue = internWeakRef.deref();
    if (
      internValue === undefined ||
      keys.length !== Object.keys(internValue).length
    )
      continue;
    if (keys.every((key) => (value as any)[key] === internValue[key]))
      return internValue;
  }
  for (const innerValue of Object.values(value))
    if (
      !(
        [
          "string",
          "number",
          "bigint",
          "boolean",
          "symbol",
          "undefined",
        ].includes(typeof innerValue) ||
        innerValue === null ||
        (innerValue as any)[intern.interned] === true
      )
    )
      throw new Error(
        `Failed to intern value because of non-interned inner value.`,
      );
  const key = Symbol();
  (value as any)[intern.interned] = true;
  Object.freeze(value);
  intern.pools[type].set(key, new WeakRef(value));
  intern.finalizationRegistry.register(value, { type, key });
  return value;
}

intern.interned = Symbol("interned");

intern.pools = {
  tuple: new Map<Symbol, WeakRef<any>>(),
  record: new Map<Symbol, WeakRef<any>>(),
};

intern.finalizationRegistry = new FinalizationRegistry<{
  type: "tuple" | "record";
  key: Symbol;
}>(({ type, key }) => {
  intern.pools[type].delete(key);
});

/*


Math.random().toString(36).slice(2)




https://npm.im/package/p-timeout
https://npm.im/package/delay
https://npm.im/package/sleep-promise
https://npm.im/package/promise-timeout
https://npm.im/package/sleep
https://npm.im/package/timeout-as-promise
https://npm.im/package/delayed
https://npm.im/package/sleep-async
https://npm.im/package/promise.timeout

*/
// /**
//     - Remove uses of `node:timers/promises`?
//  *
//  * TODO: In universal JavaScript, implement a way to **canonicalize** objects using deepEquals to be used in Sets and as Map keys (then deprecate `collections-deep-equal`).
//  *   - value objects
//  *   - https://lodash.com/docs/4.17.15#isEqual
//  * TODO: Implement using setTimeout and let it be usable in client-side JavaScript as well.
//  * TODO: Explain the differences between this and `setInterval()` (wait for completion before setting the next scheduler, and force a job to run)
//  *
//  * Start a background job that runs every given `interval`.
//  *
//  * You may use `backgroundJob.run()` to force the background job to run right away.
//  *
//  * **Note:** If a background job is running when `backgroundJob.continue()` is called.
//  *
//  * You may use `backgroundJob.stop()` to stop the background job.
//  *
//  * **Note:** If a background job is running when `backgroundJob.stop()` is called, then that background job is run to completion, but a future background job run is not scheduled. This is similar to how an HTTP server may stop  finish processing existing requests but don’t accept new requests.
//  *
//  * **Note:** The `intervalVariance` prevents many background jobs from starting at the same and overloading the machine.
//  *
//  * **Example**
//  *
//  * ```javascript
//  * import * as node from "@radically-straightforward/node";
//  *
//  * const backgroundJob = node.backgroundJob({ interval: 3 * 1000 }, () => {
//  *   console.log("backgroundJob(): Running background job...");
//  * });
//  * process.on("SIGTSTP", () => {
//  *   backgroundJob.run();
//  * });
//  * console.log(
//  *   "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to continue...",
//  * );
//  * await node.shouldTerminate();
//  * backgroundJob.stop();
//  * ```
//  */
// export function backgroundJob(
//   {
//     interval,
//     intervalVariance = 0.1,
//   }: { interval: number; intervalVariance?: number },
//   function_: () => void | Promise<void>,
// ): { run: () => void; stop: () => void } {
//   let shouldContinue = true;
//   let abortController = new AbortController();
//   (async () => {
//     while (shouldContinue) {
//       await function_();
//       await timers
//         .setTimeout(
//           interval + interval * intervalVariance * Math.random(),
//           undefined,
//           { signal: abortController.signal },
//         )
//         .catch(() => {});
//       abortController = new AbortController();
//     }
//   })();
//   return {
//     run: () => {
//       abortController.abort();
//     },
//     stop: () => {
//       shouldContinue = false;
//       abortController.abort();
//     },
//   };
// }
