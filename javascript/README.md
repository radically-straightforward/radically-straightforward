# Radically Straightforward · JavaScript

**⚙️ Browser JavaScript in [Tagged Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)**

## Installation

```console
$ npm install --save-dev @radically-straightforward/javascript
```

> **Note:** We recommend installing `@radically-straightforward/javascript` as a development dependency because `@radically-straightforward/build` can build the `` javascript`___` `` tagged templates away on the server and bundle the JavaScript framework on the browser.

> **Note:** We recommend the **[es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** Visual Studio Code extension to syntax highlight browser JavaScript in tagged templates.

## Usage

```typescript
import javascript, { JavaScript } from "@radically-straightforward/javascript";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `JavaScript`

```typescript
export type JavaScript = string;
```

A type alias to make your type annotations more specific.

### `javascript()`

```typescript
export default function javascript(
  templateStrings: TemplateStringsArray,
  ...substitutions: any[]
): JavaScript;
```

A [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for browser JavaScript:

```typescript
javascript`
  console.log(${["Hello World", 2]});
`;
```

> **Note:** Browser JavaScript is represented as a string and this tagged template works by performing string interpolation. The substitutions are `JSON.stringify()`ed. This is conceptually simple and fast. To process the generated JavaScript, find issues automatically, and so forth, refer to [`@radically-straightforward/build`](https://www.npmjs.com/package/@radically-straightforward/build).

<!-- DOCUMENTATION END: ./source/index.mts -->

### Browser JavaScript

```javascript
import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
```

<!-- DOCUMENTATION START: ./static/index.mjs -->

### `isSafari`

```typescript
export const isSafari;
```

Source: <https://github.com/DamonOehlman/detect-browser/blob/546e6f1348375d8a486f21da07b20717267f6c49/src/index.ts#L166>

<!-- DOCUMENTATION END: ./static/index.mjs -->

## Live Navigation

TODO: `@radically-straightforward/server` refers to this.

## Live Connection

TODO: `@radically-straightforward/server` refers to this.

## Related Work

TODO
