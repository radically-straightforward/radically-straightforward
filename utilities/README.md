# Radically Straightforward · Utilities

**🛠️ Utilities for Node.js and the browser**

## Installation

```console
$ npm install @radically-straightforward/utilities
```

## Usage

```typescript
import * as utilities from "@radically-straightforward/utilities";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `sleep()`

```typescript
export function sleep(duration: number): Promise<void>;
```

A promisified version of `setTimeout()`. Bare-bones: It doesn’t even offer a way to `clearTimeout()`. Useful in JavaScript that may run in the browser—if you’re only targeting Node.js then you’re better served by [`timersPromises.setTimeout()`](https://nodejs.org/api/timers.html#timerspromisessettimeoutdelay-value-options).

### `randomString()`

```typescript
export function randomString(): string;
```

A fast random string generator. The generated strings vary in length, but are generally around 10 characters. The generated strings include the characters `[a-z0-9]`. The generated strings are **not** cryptographically secure—if you need that, then use [`crypto-random-string`](https://www.npmjs.com/package/crypto-random-string).

### `log()`

```typescript
export function log(...messageParts: string[]): void;
```

Tab-separated logging.

### `JSONLinesTransformStream`

```typescript
export class JSONLinesTransformStream extends TransformStream;
```

A [TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream) to convert a stream of a string with JSON lines into a stream of JSON objects.

**Example**

```typescript
const reader = new Blob([
  `\n\n${JSON.stringify("hi")}\n${JSON.stringify({ hello: "world" })}\n`,
])
  .stream()
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new utilities.JSONLinesTransformStream())
  .getReader();
(await reader.read()).value; // => "hi"
(await reader.read()).value; // => { hello: "world" }
(await reader.read()).value; // => undefined
```

### `capitalize()`

```typescript
export function capitalize(string: string): string;
```

Capitalizes the first letter of a string. It’s different from [Lodash’s `capitalize()`](https://lodash.com/docs/4.17.15#capitalize) in that it doesn’t lowercase the rest of the string.

### `dedent()`

```typescript
export function dedent(
  templateStrings: TemplateStringsArray,
  ...substitutions: any[]
);
```

Removes indentation from a [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for more readable code.

This is different from [the dedent package](https://www.npmjs.com/package/dedent) in the order of execution: the dedent package resolves interpolations first and removes indentation second, while `dedent()` removes indentation first and resolves interpolations second.

This different comes in play when the interpolated string contains newlines and indentation: with the dedent package the interpolated string must be aware of the context in which it’s used or it may break the dedenting, but with `dedent()` the dedenting works regardless of the string being interpolated.

Consider the following example:

```javascript
const exampleOfInterpolatedString =
  "example of\n an interpolated string including a newline and indentation";

dedentPackage`
  Here is an

  ${exampleOfInterpolatedString}

  followed by some more text.
`;
// => "Here is an\n\n example of\nan interpolated string including a newline and indentation\n\n followed by some more text."

utilities.dedent`
  Here is an

  ${exampleOfInterpolatedString}

  followed by some more text.
`;
// => "Here is an\n\nexample of\n an interpolated string including a newline and indentation\n\nfollowed by some more text."
```

### `tokenize()`

```typescript
export function tokenize(
  text: string,
  {
    stopWords = new Set(),
    stem = (token) => token,
  }: {
    stopWords?: Set<string>;
    stem?: (token: string) => string;
  } = {},
): {
  token: string;
  start: number;
  end: number;
}[];
```

Processes text into tokens that can be used for full-text search.

The part that breaks the text into tokens matches the behavior of [SQLite’s Unicode61 Tokenizer](https://www.sqlite.org/fts5.html#unicode61_tokenizer).

The `stopWords` are removed from the text. They are expected to be the result of `normalizeToken()`.

The `stem()` allows you to implement, for example, [SQLite’s Porter Tokenizer](https://www.sqlite.org/fts5.html#porter_tokenizer).

Reasons to use `tokenize()` instead of SQLite’s Tokenizers:

1. `tokenize()` provides a source map, linking each to token back to the ranges in `text` where they came from. This is useful in `utilities.highlight()`. [SQLite’s own `highlight()` function](https://www.sqlite.org/fts5.html#the_highlight_function) doesn’t allow you to, for example, do full-text search on just the text from a message, while `highlight()`ing the message including markup.
2. The `stopWords` may be removed.
3. The `stem()` may support other languages, while SQLite’s Porter Tokenizer only supports English.

When using `tokenize()`, it’s appropriate to rely on the default tokenizer in SQLite, Unicode61.

We recommend using [Natural](https://naturalnode.github.io/natural/) for [`stopWords`](https://github.com/NaturalNode/natural/tree/791df0bb8011c6caa8fc2a3a00f75deed4b3a855/lib/natural/util) and [`stem()`](https://github.com/NaturalNode/natural/tree/791df0bb8011c6caa8fc2a3a00f75deed4b3a855/lib/natural/stemmers).

**Example**

```typescript
import * as utilities from "@radically-straightforward/utilities";
import natural from "natural";

console.log(
  utilities.tokenize(
    "For my peanuts allergy peanut butter is sometimes used.",
    {
      stopWords: new Set(
        natural.stopwords.map((stopWord) => utilities.normalizeToken(stopWord))
      ),
      stem: (token) => natural.PorterStemmer.stem(token),
    }
  )
);
// =>
// [
//   { token: 'peanut', start: 7, end: 14 },
//   { token: 'allergi', start: 15, end: 22 },
//   { token: 'peanut', start: 23, end: 29 },
//   { token: 'butter', start: 30, end: 36 },
//   { token: 'sometim', start: 40, end: 49 },
//   { token: 'us', start: 50, end: 54 }
// ]
```

### `normalizeToken()`

```typescript
export function normalizeToken(token: string): string;
```

Normalize a token for `utilities.tokenize()`. It removes accents, for example, `ú` turns into `u`. It lower cases, for example, `HeLlO` becomes `hello`.

**References**

- https://stackoverflow.com/a/37511463

### `highlight()`

```typescript
export function highlight(
  text: string,
  search: Set<string>,
  {
    start = `<span class="highlight">`,
    end = `</span>`,
    ...tokenizeOptions
  }: {
    start?: string;
    end?: string;
  } & Parameters<typeof tokenize>[1] = {},
): string;
```

TODO

### `isDate()`

```typescript
export function isDate(string: string): boolean;
```

Determine whether the given `string` is a valid `Date`, that is, it’s in ISO format and corresponds to an existing date, for example, it is **not** April 32nd.

### `emailRegExp`

```typescript
export const emailRegExp: RegExp;
```

A regular expression that matches valid email addresses. This regular expression is more restrictive than the RFC—it doesn’t match some email addresses that technically are valid, for example, `example@localhost`. But it strikes a good tradeoff for practical purposes, for example, signing up in a web application.

### `ISODateRegExp`

```typescript
export const ISODateRegExp: RegExp;
```

A regular expression that matches ISO dates, for example, `2024-04-01T14:19:48.162Z`.

### `Intern`

```typescript
export type Intern<Type> = Readonly<
  Type & {
    [internSymbol]: true;
  }
>;
```

Utility type for `intern()`.

### `InternInnerValue`

```typescript
export type InternInnerValue =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | undefined
  | null
  | Intern<unknown>;
```

Utility type for `intern()`.

### `intern()`

```typescript
export function intern<
  Type extends
    | Array<InternInnerValue>
    | {
        [key: string]: InternInnerValue;
      },
>(value: Type): Intern<Type>;
```

[Interning](<https://en.wikipedia.org/wiki/Interning_(computer_science)>) a value makes it unique across the program, which is useful for checking equality with `===` (reference equality), using it as a key in a `Map`, adding it to a `Set`, and so forth:

```typescript
import { intern as $ } from "@radically-straightforward/utilities";

[1] === [1]; // => false
$([1]) === $([1]); // => true

{
  const map = new Map<number[], number>();
  map.set([1], 1);
  map.set([1], 2);
  map.size; // => 2
  map.get([1]); // => undefined
}

{
  const map = new Map<utilities.Intern<number[]>, number>();
  map.set($([1]), 1);
  map.set($([1]), 2);
  map.size; // => 1
  map.get($([1])); // => 2
}

{
  const set = new Set<number[]>();
  set.add([1]);
  set.add([1]);
  set.size; // => 2
  set.has([1]); // => false
}

{
  const set = new Set<utilities.Intern<number[]>>();
  set.add($([1]));
  set.add($([1]));
  set.size; // => 1
  set.has($([1])); // => true
}
```

> **Note:** We recommend that you alias `intern as $` when importing it to make your code less noisy.

> **Node:** Inner values must be either primitives or interned values themselves, for example, `$([1, $({})])` is valid, but `$([1, {}])` is not.

> **Node:** Currently only arrays (tuples) and objects (records) may be interned. In the future we may support more types, for example, `Map`, `Set`, regular expressions, and so forth.

> **Note:** You must not mutate an interned value. Interned values are [frozen](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) to prevent mutation.

> **Note:** Interning a value is a costly operation which grows more expensive as you intern more values. Only intern values when really necessary.

> **Note:** Interned objects do not preserve the order of the attributes: `$({ a: 1, b: 2 }) === $({ b: 2, a: 1 })`.

> **Note:** The pool of interned values is available as `intern.pool`. The interned values are kept with `WeakRef`s to allow them to be garbage collected when they aren’t referenced anywhere else anymore. There’s a `FinalizationRegistry` at `intern.finalizationRegistry` that cleans up interned values that have been garbage collected.

**Related Work**

**[JavaScript Records & Tuples Proposal](https://github.com/tc39/proposal-record-tuple)**

A proposal to include immutable objects (Records) and immutable arrays (Tuples) in JavaScript. This subsumes most of the need for `intern()`.

It includes a [polyfill](https://github.com/bloomberg/record-tuple-polyfill) which works very similarly to `intern()` but requires different functions for different data types.

**[`collections-deep-equal`](https://www.npmjs.com/package/collections-deep-equal)**

A previous solution to this problem which took a different approach: Instead of interning the values and allowing you to use JavaScript’s `Map`s and `Set`s, `collections-deep-equal` extends `Map`s and `Set`s with a different notion of equality.

`collections-deep-equal` doesn’t address the issue of comparing values with `===` (reference equality).

`collections-deep-equal` does more work on every manipulation of the data structure, for example, when looking up a key in a `Map`, so it may be slower.

`collections-deep-equal` has different intern pools for each `Map` and `Set` instead of `intern()`’s single global intern pool, which may be advantageous because smaller pools may be faster to traverse.

**[Immutable.js](https://www.npmjs.com/package/immutable), [`collections`](https://www.npmjs.com/package/collections), [`mori`](https://www.npmjs.com/package/mori), [TypeScript Collections](https://www.npmjs.com/package/typescript-collections), [`prelude-ts`](https://www.npmjs.com/package/prelude-ts), [`collectable`](https://www.npmjs.com/package/collectable), and so forth**

Similar to `collections-deep-equal`, these libraries implement their own data structures instead of relying on JavaScript’s `Map`s and `Set`s. Some of them go a step further and add their own notions of objects and arrays, which requires you to convert your values back and forth, may not show up nicely in the JavaScript inspector, may be less ergonomic to use with TypeScript, and so forth.

The advantage of these libraries over interning is that they may be faster.

**[`immer`](https://www.npmjs.com/package/immer) and [`icepick`](https://www.npmjs.com/package/icepick)**

Introduce a new way to create values based on existing values.

**[`seamless-immutable`](https://www.npmjs.com/package/seamless-immutable)**

Modifies existing values more profoundly than freezing.

**[`es6-array-map`](https://www.npmjs.com/package/es6-array-map), [`valuecollection`](https://www.npmjs.com/package/valuecollection), [`@strong-roots-capital/map-objects`](https://www.npmjs.com/package/@strong-roots-capital/map-objects), and so forth**

Similar to `collections-deep-equal` but either incomplete, or lacking type definitions, and so forth.

**Other**

- <https://2ality.com/2015/01/es6-maps-sets.html#why-can’t-i-configure-how-maps-and-sets-compare-keys-and-values%3F>
- <https://stackoverflow.com/questions/21838436/map-using-tuples-or-objects>
- <https://esdiscuss.org/topic/maps-with-object-keys>
- <https://medium.com/@modernserf/the-tyranny-of-triple-equals-de46cc0c5723>
- <https://medium.com/@modernserf/the-tyranny-of-triple-equals-de46cc0c5723>
- <https://twitter.com/swannodette/status/1067962983924539392>
- <https://gist.github.com/modernserf/c000e62d40f678cf395e3f360b9b0e43>

### `backgroundJob()`

```typescript
export function backgroundJob(
  {
    interval,
    onStop = () => {},
  }: {
    interval: number;
    onStop?: () => void | Promise<void>;
  },
  job: () => void | Promise<void>,
): {
  run: () => Promise<void>;
  stop: () => Promise<void>;
};
```

> **Note:** This is a lower level utility. See `@radically-straightforward/node`’s and `@radically-straightforward/javascript`’s extensions to `backgroundJob()` that are better suited for their specific environments.

Start a background job that runs every `interval`.

`backgroundJob()` is different from `setInterval()` in the following ways:

1. The interval counts **between** jobs, so slow background jobs don’t get called concurrently:

   ```
   setInterval()
   | SLOW BACKGROUND JOB |
   | INTERVAL | SLOW BACKGROUND JOB |
              | INTERVAL | ...

   backgroundJob()
   | SLOW BACKGROUND JOB | INTERVAL | SLOW BACKGROUND JOB | INTERVAL | ...
   ```

2. You may use `backgroundJob.run()` to force the background job to run right away. If the background job is already running, calling `backgroundJob.run()` schedules it to run again as soon as possible (with a wait interval of `0`).

3. You may use `backgroundJob.stop()` to stop the background job. If the background job is in the middle of running, it will finish but it will not be scheduled to run again. This is similar to how an HTTP server may terminate gracefully by stopping accepting new requests but finishing responding to existing requests. After a job has been stopped, you may not `backgroundJob.run()` it again (calling `backgroundJob.run()` has no effect).

4. We introduce a random interval variance of 10% on top of the given `interval` to avoid many background jobs from starting at the same time and overloading the machine.

> **Note:** If the job throws an exception, the exception is logged and the background job continues.

### `timeout()`

```typescript
export async function timeout<Type>(
  duration: number,
  function_: () => Promise<Type>,
): Promise<Type>;
```

Run the given `function_` up to the timeout. If the timeout is reached, the returned promise rejects, but there is no way to guarantee that the `function_` execution will stop.

### `foregroundJob()`

```typescript
export function foregroundJob(
  job: () => void | Promise<void>,
): () => Promise<void>;
```

Controls the execution of the given `job` such that it can’t execute until the previous execution finished.

This is useful, for example, for an autocomplete feature in which an event listener of the `keydown` event `fetch()`es from the server. If the function is called while it’s running, then it schedules itself to be executed again as soon as it completes.

This is different from `backgroundJob()` because it doesn’t run periodically—it only runs when it’s called.

This is different from Lodash’s [`debounce()`](https://lodash.com/docs/4.17.15#debounce) and [`throttle()`](https://lodash.com/docs/4.17.15#throttle) because it isn’t based on timed delays—it’s designed for when the `job` itself is slow.

<!-- DOCUMENTATION END: ./source/index.mts -->
