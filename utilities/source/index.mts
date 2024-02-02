/**
 * Start a background job that runs every `interval`.
 *
 * This is different from `setInterval()` in the following ways:
 *
 * 1. The interval counts **between** jobs, so slow background jobs don’t get called concurrently:
 *
 *    ```
 *    setInterval()
 *    | SLOW BACKGROUND JOB |
 *    | INTERVAL | SLOW BACKGROUND JOB |
 *               | INTERVAL | ...
 *
 *    backgroundJob()
 *    | SLOW BACKGROUND JOB | INTERVAL | SLOW BACKGROUND JOB | INTERVAL | ...
 *    ```
 *
 * 2. We introduce a random `intervalVariance` to avoid many background jobs from starting at the same time and overloading the machine.
 *
 * 3. You may use `backgroundJob.run()` to force the background job to run right away. If the background job is already running, calling `backgroundJob.run()` schedules it to run again as soon as possible (not waiting the interval).
 *
 * 4. You may use `backgroundJob.stop()` to stop the background job. If the background job is running, it will finish but it will not be scheduled to run again. This is similar to how an HTTP server may terminate gracefully by stopping accepting new requests but finishing responding to existing requests. After a job has been stopped, you may not `backgroundJob.run()` it again (calling `backgroundJob.run()` has no effect).
 *
 * **Example**
 *
 * ```javascript
 * import * as utilities from "@radically-straightforward/utilities";
 * import * as node from "@radically-straightforward/node";
 *
 * const backgroundJob = utilities.backgroundJob(
 *   { interval: 3 * 1000 },
 *   async () => {
 *     console.log("backgroundJob(): Running background job...");
 *     await utilities.sleep(3 * 1000);
 *     console.log("backgroundJob(): ...finished running background job.");
 *   },
 * );
 * console.log(
 *   "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to continue...",
 * );
 * process.on("SIGTSTP", () => {
 *   backgroundJob.run();
 * });
 * await node.shouldTerminate();
 * backgroundJob.stop();
 * ```
 */
export function backgroundJob(
  {
    interval,
    intervalVariance = 0.1,
  }: { interval: number; intervalVariance?: number },
  job: () => void | Promise<void>,
): { run: () => void; stop: () => void } {
  let state:
    | "initial"
    | "running"
    | "runningAndMarkedForRerun"
    | "sleeping"
    | "stopped" = "initial";
  let timeout: any = undefined;
  async function run() {
    state = "running";
    await job();
    if (state === "running" || state === "runningAndMarkedForRerun") {
      timeout = setTimeout(
        run,
        (state as any) === "runningAndMarkedForRerun"
          ? 0
          : interval + interval * intervalVariance * Math.random(),
      );
      state = "sleeping";
    }
  }
  run();
  return {
    run: () => {
      switch (state) {
        case "sleeping":
          clearTimeout(timeout);
          run();
          break;
        case "running":
          state = "runningAndMarkedForRerun";
          break;
      }
    },
    stop: () => {
      if (state === "sleeping") clearTimeout(timeout);
      state = "stopped";
    },
  };
}

/**
 * A promisified version of `setTimeout()`. Bare-bones: It doesn’t even offer a way to `clearTimeout()`. Useful in JavaScript that may run in the browser—if you’re only targeting Node.js then you’re better served by [`timersPromises.setTimeout()`](https://nodejs.org/dist/latest-v21.x/docs/api/timers.html#timerspromisessettimeoutdelay-value-options).
 */
export function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

/**
 * A fast random string generator. The generated strings are 10 or 11 characters in length. The generated strings include the characters `[0-9a-z]`. The generated strings are **not** cryptographically secure—if you need that, then use [`crypto-random-string`](https://www.npmjs.com/package/crypto-random-string).
 */
export function randomString(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Tab-separated logging.
 */
export function log(...messageParts: string[]): void {
  console.log(messageParts.join(" \t"));
}

/**
 * Utility type for `intern()`.
 */
export type Interned<Type> = Readonly<Type & { [internSymbol]: true }>;

type InternInnerKey = number | symbol | string;
/**
 * Utility type for `intern()`.
 */
export type InternInnerValue =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | undefined
  | null
  | Interned<unknown>;

type InternCacheNode = {
  /** A weak reference to the final Tuple or Record we have interned */
  internedObject?: WeakRef<Interned<any>>;
  /** The intermediary key for this node ie `node.innerKey === node.parent.get(node.innerKey).get(node.innerValue).innerKey` */
  innerKey?: InternInnerKey;
  /** The intermediary value for this node ie `node.innerValue === node.parent.get(node.innerKey).get(node.innerValue).innerValue` */
  innerValue?: InternInnerValue;
  parent?: InternCacheNode;
  children?: Map<InternInnerKey, Map<InternInnerValue, InternCacheNode>>;
};

/**
 * [Interning](<https://en.wikipedia.org/wiki/Interning_(computer_science)>) a value makes it unique across the program, which is useful for checking equality with `===` (reference equality), using it as a key in a `Map`, adding it to a `Set`, and so forth:
 *
 * ```typescript
 * import { intern as $ } from "@radically-straightforward/utilities";
 *
 * [1] === [1]; // => false
 * $([1]) === $([1]); // => true
 *
 * {
 *   const map = new Map<number[], number>();
 *   map.set([1], 1);
 *   map.set([1], 2);
 *   map.size; // => 2
 *   map.get([1]); // => undefined
 * }
 *
 * {
 *   const map = new Map<utilities.Intern<number[]>, number>();
 *   map.set($([1]), 1);
 *   map.set($([1]), 2);
 *   map.size; // => 1
 *   map.get($([1])); // => 2
 * }
 *
 * {
 *   const set = new Set<number[]>();
 *   set.add([1]);
 *   set.add([1]);
 *   set.size; // => 2
 *   set.has([1]); // => false
 * }
 *
 * {
 *   const set = new Set<utilities.Intern<number[]>>();
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
 * > **Note:** Interned objects do not preserve the order of the attributes: `$({ a: 1, b: 2 }) === $({ b: 2, a: 1 })`.
 *
 * > **Note:** The pool of interned values is available as `intern.pool`. The interned values are kept with `WeakRef`s to allow them to be garbage collected when they aren’t referenced anywhere else anymore. There’s a `FinalizationRegistry` at `intern.finalizationRegistry` that cleans up interned values that have been garbage collected.
 *
 * **Related Work**
 *
 * **[JavaScript Records & Tuples Proposal](https://github.com/tc39/proposal-record-tuple)**
 *
 * A proposal to include immutable objects (Records) and immutable arrays (Tuples) in JavaScript. This subsumes most of the need for `intern()`.
 *
 * It includes a [polyfill](https://github.com/bloomberg/record-tuple-polyfill) which works very similarly to `intern()` but requires different functions for different data types.
 *
 * **[`collections-deep-equal`](https://www.npmjs.com/package/collections-deep-equal)**
 *
 * A previous solution to this problem which took a different approach: Instead of interning the values and allowing you to use JavaScript’s `Map`s and `Set`s, `collections-deep-equal` extends `Map`s and `Set`s with a different notion of equality.
 *
 * `collections-deep-equal` doesn’t address the issue of comparing values with `===` (reference equality).
 *
 * `collections-deep-equal` does more work on every manipulation of the data structure, for example, when looking up a key in a `Map`, so it may be slower.
 *
 * `collections-deep-equal` has different intern pools for each `Map` and `Set` instead of `intern()`’s single global intern pool, which may be advantageous because smaller pools may be faster to traverse.
 *
 * **[Immutable.js](https://www.npmjs.com/package/immutable), [`collections`](https://www.npmjs.com/package/collections), [`mori`](https://www.npmjs.com/package/mori), [TypeScript Collections](https://www.npmjs.com/package/typescript-collections), [`prelude-ts`](https://www.npmjs.com/package/prelude-ts), [`collectable`](https://www.npmjs.com/package/collectable), and so forth**
 *
 * Similar to `collections-deep-equal`, these libraries implement their own data structures instead of relying on JavaScript’s `Map`s and `Set`s. Some of them go a step further and add their own notions of objects and arrays, which requires you to convert your values back and forth, may not show up nicely in the JavaScript inspector, may be less ergonomic to use with TypeScript, and so forth.
 *
 * The advantage of these libraries over interning is that they may be faster.
 *
 * **[`immer`](https://www.npmjs.com/package/immer) and [`icepick`](https://www.npmjs.com/package/icepick)**
 *
 * Introduce a new way to create values based on existing values.
 *
 * **[`seamless-immutable`](https://www.npmjs.com/package/seamless-immutable)**
 *
 * Modifies existing values more profoundly than freezing.
 *
 * **[`es6-array-map`](https://www.npmjs.com/package/es6-array-map), [`valuecollection`](https://www.npmjs.com/package/valuecollection), [`@strong-roots-capital/map-objects`](https://www.npmjs.com/package/@strong-roots-capital/map-objects), and so forth**
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
export function intern<
  Type extends Array<InternInnerValue> | { [key: string]: InternInnerValue },
>(value: Type): Interned<Type> {
  for (const innerValue of Object.values(value))
    if (
      !(
        typeof innerValue === "string" ||
        typeof innerValue === "number" ||
        typeof innerValue === "bigint" ||
        typeof innerValue === "boolean" ||
        typeof innerValue === "symbol" ||
        innerValue === undefined ||
        innerValue === null ||
        intern.isInterned(innerValue)
      )
    )
      throw new Error(
        `Failed to intern value because of non-interned inner value.`,
      );

  const isTuple = Array.isArray(value);
  const entries = isTuple
    ? value.entries()
    : Object.entries(value).sort(([aKey], [bKey]) => aKey.localeCompare(bKey));

  // Find leaf node, creating intermediary nodes as necessary
  let node = isTuple ? intern._pool.tuples : intern._pool.records;
  for (const [key, innerValue] of entries) {
    if (node.children === undefined) node.children = new Map();
    if (!node.children.has(key)) node.children.set(key, new Map());
    const valueMap = node.children.get(key)!;
    if (!valueMap.has(innerValue))
      valueMap.set(innerValue, {
        parent: node,
        innerKey: key,
        innerValue: innerValue,
      });
    node = valueMap.get(innerValue)!;
  }

  // If we already have a value, return it
  const existingValue = node.internedObject?.deref();
  if (existingValue !== undefined) return existingValue;

  // Otherwise intern the value and cache it
  intern._markInterned(value);
  node.internedObject = new WeakRef(value);
  intern._finalizationRegistry.register(value, node);
  return value as Interned<Type>;
}

const internSymbol = Symbol("intern");
intern._markInterned = (value: any) => {
  Object.defineProperty(value, internSymbol, {
    enumerable: false,
    value: true,
  });
  Object.freeze(value);
};

intern.isInterned = (value: any): boolean =>
  (value as any)[internSymbol] === true;

intern._pool = {
  tuples: {} as InternCacheNode,
  records: {} as InternCacheNode,
};

intern._finalizationRegistryCallback = (node: InternCacheNode) => {
  // Value has been garbage collected prune the tree
  let currentNode: InternCacheNode | undefined = node;
  while (currentNode?.parent && currentNode.innerKey !== undefined) {
    // If the current node has no children and no final value, delete it
    if (!currentNode.children?.size && !currentNode.internedObject?.deref()) {
      currentNode.parent.children
        ?.get(currentNode.innerKey)
        ?.delete(currentNode.innerValue);

      if (currentNode.parent.children?.get(currentNode.innerKey)?.size === 0)
        currentNode.parent.children.delete(currentNode.innerKey);
    }

    currentNode = currentNode.parent;
  }
};
intern._finalizationRegistry = new FinalizationRegistry<InternCacheNode>(
  intern._finalizationRegistryCallback,
);
