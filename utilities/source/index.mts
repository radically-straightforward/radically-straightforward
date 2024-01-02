/*
**Collections Deep Equal** provides Maps and Sets which have the same API as native Maps and Sets, except that their notion of equality is [`util.isDeepStrictEqual()`]():

```js
import { Map, Set } from "collections-deep-equal";

const object = { name: "Leandro", age: 29 };
const deepEqualObject = { name: "Leandro", age: 29 };

const map = new Map();
assert(map.get(deepEqualObject) === "value");

const set = new Set();
assert(set.has(deepEqualObject));
```

## Installation

Install with `npm`:

```console
$ npm install collections-deep-equal
```

The package comes with type definitions for [TypeScript](https://www.typescriptlang.org).

If you wish to use only **Collections Deep Equal** and not native Maps and Sets, import the library:

```js
import { Map, Set } from "collections-deep-equal";
```

If you wish to use both **Collections Deep Equal** as well as native Maps and Sets in the same module, rename on import:

```js
import {
  Map as MapDeepEqual,
  Set as SetDeepEqual,
} from "collections-deep-equal";
```

## Caveats

### Performance

**Collections Deep Equal** hasn’t been benchmarked, but it should be orders of magnitude slower than the native collections, because for every access it iterates over all keys and calls `deepEqual()` on them. It’s a straightforward, if naive, implementation.

### Mutation

If you mutate objects, then the collections using them change as well:

```js
const object = { name: "Leandro", age: 29 };
const deepEqualObject = { name: "Leandro", age: 29 };

const map = new Map();
map.set(object, "value");
object.age = 30;
assert(!map.has(deepEqualObject));
deepEqualObject.age = 30;
assert(map.has(deepEqualObject));
```

## Additional Features

### `merge()`

```js
assert.deepEqual(
  new Map([
    ["a", new Set([1])],
    ["b", new Set([2])],
  ]).merge(
    new Map([
      ["b", new Set([3])],
      ["c", new Set([4])],
    ])
  ),
  new Map([
    ["a", new Set([1])],
    ["b", new Set([2, 3])],
    ["c", new Set([4])],
  ])
);

assert.deepEqual(new Set([1]).merge(new Set([2])), new Set([1, 2]));
```

### `toJSON()`

```js
assert(JSON.stringify(new Map([["a", 1]])) === `[["a",1]]`);
assert(JSON.stringify(new Set([1, 2])) === `[1,2]`);
```

## Related Work

### People Discussing the Issue

- https://2ality.com/2015/01/es6-maps-sets.html#why-can’t-i-configure-how-maps-and-sets-compare-keys-and-values%3F
- https://stackoverflow.com/questions/21838436/map-using-tuples-or-objects
- https://esdiscuss.org/topic/maps-with-object-keys
- https://medium.com/@modernserf/the-tyranny-of-triple-equals-de46cc0c5723

### Other Libraries That Implementation Alternative Collections

- https://immutable-js.github.io/immutable-js/
- http://swannodette.github.io/mori/
- https://www.npmjs.com/package/typescript-collections
- https://www.npmjs.com/package/prelude-ts
- https://www.npmjs.com/package/collectable
- https://www.collectionsjs.com

The advantages of **Collections Deep Equal** over these libraries are:

1. You don’t have to buy into completely new data structures like Immutable.js’s Records. These other data structures may have different APIs and therefore have a bit of a learning curve; they may be more difficult to inspect in debuggers; they may not work well with other libraries, forcing you to convert back and forth; and they may annoying to use in TypeScript.

2. The notion of equality is determined by the data structures, not by the elements. In most of these libraries, elements are forced to implement `equals()` and `hash()`, which makes sense in a object-oriented style, but not in a functional style.

3. Immutability is possible and encouraged, but not enforced. For better and for worse.

4. **Collections Deep Equal** is [so simple](source/index.ts) that you could maintain it yourself if it’s abandoned, like some of the packages above seem to have been. But don’t worry, **Collections Deep Equal** is being used in [my dissertation](https://github.com/leafac/yocto-cfa), so it’ll stick around.

### Other Approaches to Immutability

- https://immerjs.github.io/immer/docs/introduction
- https://www.npmjs.com/package/seamless-immutable
- https://www.npmjs.com/package/icepick
- https://www.npmjs.com/package/deep-freeze

These libraries don’t provide new data structures. They’re just facilitating the use of immutable data structures, which may pave the way to a new notion of equality.

### Very Similar But Incomplete Approaches

- https://www.npmjs.com/package/es6-array-map
- https://www.npmjs.com/package/valuecollection
- https://www.npmjs.com/package/@strong-roots-capital/map-objects

These libraries are very similar to **Collections Deep Equal** in spirit, but their implementations are either incomplete, or they lack type definitions, and so forth.

### Definitive Solutions

- https://github.com/tc39/proposal-record-tuple
- https://github.com/sebmarkbage/ecmascript-immutable-data-structures
- https://github.com/DavidBruant/Map-Set.prototype.toJSON

Proposals to change the JavaScript language in ways that would make this package obsolete.

## Changelog

### 3.0.1 · 2022-10-15

- Hotfix of 3.0.0 release, which didn’t include the `build/` files 🤦‍♂️

### 3.0.0 · 2022-10-15

- Modernized the codebase & turned it into an [ESM-only package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

### 2.0.0 · 2020-06-26

- The names of the exports are now `Map` and `Set`, with the intent of overriding the native implementation on import.

### 1.1.0 · 2020-03-24

- Use [`util.isDeepStrictEqual()`](https://nodejs.org/api/util.html#util_util_isdeepstrictequal_val1_val2) instead of [`deep-equal`](https://www.npmjs.com/package/deep-equal).

### 1.0.1 · 2020-03-23

- Better `README` formatting.

### 1.0.0 · 2020-03-04

- Initial release with `MapDeepEqual` and `SetDeepEqual`.










Possible notions of equality:
- Deep equality
  - https://nodejs.org/api/util.html#utilisdeepstrictequalval1-val2
    - But we need some sort of polyfill for the browser
  - https://lodash.com/docs/4.17.15#isEqual
- Shallow equality
  - https://legacy.reactjs.org/docs/react-api.html#reactpurecomponent
  - Faster than deep equality
  - Makes for awkward constructors: `valueObject({ a: valueObject([1, 2, 3] )})` (note how each layer needs a call to `valueObject())`
  - That’s what the existing proposal does
- Freeze?
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
  - Deeply?
    - https://github.com/christophehurpeau/deep-freeze-es6
- WeakRef?

Notes:
- Immutability

Discussions:
- https://medium.com/@modernserf/the-tyranny-of-triple-equals-de46cc0c5723
- https://twitter.com/swannodette/status/1067962983924539392
  - https://gist.github.com/modernserf/c000e62d40f678cf395e3f360b9b0e43

Proposals:
- https://github.com/tc39/proposal-record-tuple
- https://github.com/sebmarkbage/ecmascript-immutable-data-structures

Existing solutions:
- https://github.com/immutable-js/immutable-js
- https://github.com/immerjs/immer

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

