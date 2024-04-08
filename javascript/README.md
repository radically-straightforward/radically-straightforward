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

- Form validation.
- Warn before leaving page with unsubmitted form.

<!-- DOCUMENTATION START: ./static/index.mjs -->

### `weekday()`

```typescript
export function weekday(dateString);
```

Returns a string with the week day in English, for example, `Monday`.

### `stringToElement()`

```typescript
export function stringToElement(string);
```

Convert a string into a DOM element. The string may have multiple siblings without a common parent, so `stringToElement()` returns a `<div>` containing the elements.

### `parents()`

```typescript
export function parents(element);
```

Returns an array of parents, including `element` itself. It knows how to navigate up Tippy.js’s tippys that aren’t mounted.

### `children()`

```typescript
export function children(element);
```

Returns an array of children, including `element` itself.

### `nextSiblings()`

```typescript
export function nextSiblings(element);
```

Returns an array of sibling elements, including `element` itself.

### `previousSiblings()`

```typescript
export function previousSiblings(element);
```

Returns an array of sibling elements, including `element` itself.

### `isConnected()`

```typescript
export function isConnected(element);
```

Check whether the `element` is connected to the document. This is different from the [`isConnected` property](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected) in the following ways:

1. It uses `parents()`, so it supports Tippy.js’s tippys that aren’t mounted but whose `target`s are connected.

2. You may force an element to be connected by setting `element.forceIsConnected = true` on the `element` itself or on one of its parents.

This is useful, for example, for elements that periodically update their own contents, for example, a text field that displays relative time, for example, “three hours ago”. You can check that the element has been disconnected from the document and stop the periodic updates.

### `isAppleDevice`

```typescript
export const isAppleDevice;
```

Source: <https://github.com/ccampbell/mousetrap/blob/2f9a476ba6158ba69763e4fcf914966cc72ef433/mousetrap.js#L135>

### `isSafari`

```typescript
export const isSafari;
```

Source: <https://github.com/DamonOehlman/detect-browser/blob/546e6f1348375d8a486f21da07b20717267f6c49/src/index.ts#L166>

### `isPhysicalKeyboard`

```typescript
export let isPhysicalKeyboard;
```

Whether the user has a physical keyboard or a virtual keyboard on a phone screen. This isn’t 100% reliable, because it works by detecting presses of modifiers keys (for example, `control`), but it works well enough.

### `shiftKey`

```typescript
export let shiftKey;
```

Whether the shift key is being held. Useful for events such as `paste`, which don’t include the state of modifier keys.

<!-- DOCUMENTATION END: ./static/index.mjs -->

## Live Navigation

TODO: `@radically-straightforward/server` refers to this.

## Live Connection

TODO: `@radically-straightforward/server` refers to this.

## Related Work

TODO
