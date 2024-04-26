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

- Live Navigation.
- `execute()`.
- Form validation.
- Warn before leaving page with unsubmitted form.
- Tippy.js configuration.

<!-- DOCUMENTATION START: ./static/index.mjs -->

### `configuration`

```typescript
export const configuration;
```

TODO

### `liveConnection()`

```typescript
export async function liveConnection(requestId);
```

TODO

### `mount()`

```typescript
export function mount(element, content, event = undefined);
```

`morph()` the `element` container to include `content`. `execute()` the browser JavaScript in the `element`. Protect the `element` from changing in Live Connection updates.

### `documentMount()`

```typescript
export function documentMount(content, event = new Event("DOMContentLoaded"));
```

> **Note:** This is a low-level function used by Live Navigation and Live Connection.

Similar to `mount()`, but suited for morphing the entire `document`. If the `document` and the `content` have `<meta name="version" content="___" />` with different `content`s, then `documentMount()` displays an error message in a `tippy()` and doesn’t mount the new document.

### `morph()`

```typescript
export function morph(from, to, event = undefined);
```

> **Note:** This is a low-level function—in most cases you want to call `mount()` instead.

Morph the contents of the `from` container element into the contents of the `to` container element with minimal DOM manipulation by using a diffing algorithm.

If the `to` element is a string, then it’s first converted into an element with `stringToElement()`.

Elements may provide a `key="___"` attribute to help identify them with respect to the diffing algorithm. This is similar to [React’s `key`s](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key), but sibling elements may have the same `key` (at the risk of potentially getting them mixed up if they’re reordered).

When `morph()` is called to perform a Live Connection update (that is,`event?.detail.liveConnectionUpdate`is `true`), elements may set a `liveConnectionUpdate` attribute, which controls the behavior of `morph()` in the following ways:

- When `from.liveConnectionUpdate` is `false`, `morph()` doesn’t do anything. This is useful for elements which contain browser state that must be preserved on Live Connection updates, for example, the container of dynamically-loaded content (see `mount()`).

- When `fromChildNode.liveConnectionUpdate` is `false`, `morph()` doesn’t remove that `fromChildNode` even if it’s missing among `to`’s child nodes. This is useful for elements that should remain on the page but wouldn’t be sent by server again in a Live Connection update, for example, an indicator of unread messages.

- When `fromChildNode.liveConnectionUpdate` or any of `fromChildNode`’s parents is `new Set(["style", "hidden", "disabled", "value", "checked"])` or any subset thereof, the mentioned attributes are updated even in a Live Connection update (normally these attributes represent browser state and are skipped in Live Connection updates). This is useful, for example, for forms with hidden fields which must be updated by the server.

> **Note:** `to` is expected to already belong to the `document`. You may need to call [`importNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode) or [`adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) on a node before passing it to `morph()`. `documentStringToElement()` does that for you.

> **Note:** `to` is mutated destructively in the process of morphing. Create a clone of `to` before passing it into `morph()` if you wish to continue using it.

**Related Work**

`morph()` is different from `from.innerHTML = to.innerHTML` because setting `innerHTML` loses browser state, for example, form inputs, scrolling position, and so forth.

`morph()` is different form [`morphdom`](https://github.com/patrick-steele-idem/morphdom) and its derivatives in the following ways:

- `morph()` deals better with insertions/deletions/moves in the middle of a list. In some situations `morphdom` touches all subsequent elements, while `morph()` tends to only touch the affected elements.

- `morph()` supports `key="___"` instead of `morphdom`’s `id="___"`s. `key`s don’t have to be unique across the document and don’t even have to be unique across the element siblings—they’re just a hint at the identity of the element that’s used in the diffing process.

- `morph()` is aware of Live Connection updates, `tippy()`s, and so forth.

### `execute()`

```typescript
export function execute(element, event = undefined);
```

> **Note:** This is a low-level function—in most cases you want to call `mount()` instead.

Execute the functions defined by the `javascript="___"` attribute, which is set by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) when extracting browser JavaScript. You must call this when you insert new elements in the DOM, for example, when mounting content.

### `tippy()`

```typescript
export function tippy({
  event = undefined,
  element,
  elementProperty = "tooltip",
  content,
  ...tippyProps
});
```

Create a [Tippy.js](https://atomiks.github.io/tippyjs/) tippy. This is different from calling Tippy’s constructor because if `tippy()` is called multiple times on the same `element` with the same `elementProperty`, then it doesn’t create new tippys but `mount()`s the `content`.

### `validate()`

```typescript
export function validate(element);
```

Validate `element` (usually a `<form>`) and its `children()`.

Validation errors are reported with `tippy()`s with the `error` theme.

Use `<form novalidate>` to disable the native browser validation, which is too permissive on email addresses, is more limited in custom validation, and so forth.

You may set the `disabled` attribute on a parent element to disable an entire subtree.

Use `element.isValid = true` to force a subtree to be valid.

`validate()` supports the `required` and `minlength` attributes, the `type="email"` input type, and custom validation.

For custom validation, use the `onvalidate` event and `throw new ValidationError()`, for example:

```javascript
html`
  <input
    type="text"
    name="name"
    required
    javascript="${javascript`
      this.onvalidate = () => {
        if (this.value !== "Leandro")
          throw new javascript.ValidationError("Invalid name.");
      };
    `}"
  />
`;
```

`validate()` powers the custom validation that `@radically-straightforward/javascript` enables by default.

### `ValidationError`

```typescript
export class ValidationError extends Error;
```

Custom error class for `validate()`.

### `validateLocalizedDateTime()`

```typescript
export function validateLocalizedDateTime(element);
```

Validate a form field that used `localizeDateTime()`. The error is reported on the `element`, but the UTC datetime that must be sent to the server is returned as a string that must be assigned to another form field, for example:

```javascript
html`
  <input type="hidden" name="datetime" value="${new Date().toISOString()}" />
  <input
    type="text"
    required
    javascript="${javascript`
      this.value = javascript.localizeDateTime(this.previousElementSibling.value);
      this.onvalidate = () => {
        this.previousElementSibling.value = javascript.validateLocalizedDateTime(this);
      };
    `}"
  />
`;
```

### `serialize()`

```typescript
export function serialize(element);
```

Produce a `URLSearchParams` from the `element` and its `children()`.

You may set the `disabled` attribute on a parent element to disable an entire subtree.

Other than that, `serialize()` follows as best as possible the behavior of the `URLSearchParams` produced by a browser form submission.

### `reset()`

```typescript
export function reset(element);
```

Reset form fields from `element` and its `children()` using their `defaultValue` and `defaultChecked` properties, including calling `element.onchange()` when necessary.

### `isModified()`

```typescript
export function isModified(element);
```

Detects whether there are form fields in `element` and its `children()` that are modified with respect to their `defaultValue` and `defaultChecked` properties.

You may set `element.isModified = <true/false>` to force the result of `isModified()` for `element` and its `children()`.

You may set the `disabled` attribute on a parent element to disable an entire subtree.

`isModified()` powers the “your changes may be lost, do you wish to leave this page?” dialog that `@radically-straightforward/javascript` enables by default.

### `relativizeDateTimeElement()`

```typescript
export function relativizeDateTimeElement(
  element,
  { target = element, capitalize = false, ...relativizeDateTimeOptions } = {},
);
```

Given an `element` with the `datetime` attribute, `relativizeDateTimeElement()` keeps it updated with a relative datetime. See `relativizeDateTime()`, which provides the relative datetime, and `backgroundJob()`, which provides the background job management.

**Example**

```javascript
html`
  <time
    datetime="2024-04-03T14:51:45.604Z"
    javascript="${javascript`
      javascript.relativizeDateTimeElement(this);
    `}"
  ></time>
`;
```

### `relativizeDateTime()`

```typescript
export function relativizeDateTime(dateString, { preposition = false } = {});
```

Returns a relative datetime, for example, `just now`, `3 minutes ago`, `in 3 minutes`, `3 hours ago`, `in 3 hours`, `yesterday`, `tomorrow`, `3 days ago`, `in 3 days`, `on 2024-04-03`, and so forth.

- **`preposition`:** Whether to return `2024-04-03` or `on 2024-04-03`.

### `localizeDateTime()`

```typescript
export function localizeDateTime(dateString);
```

Returns a localized datetime, for example, `2024-04-03 15:20`.

### `localizeDate()`

```typescript
export function localizeDate(dateString);
```

Returns a localized date, for example, `2024-04-03`.

### `localizeTime()`

```typescript
export function localizeTime(dateString);
```

Returns a localized time, for example, `15:20`.

### `formatUTCDateTime()`

```typescript
export function formatUTCDateTime(dateString);
```

Format a datetime into a representation that is user friendly.

### `stringToElement()`

```typescript
export function stringToElement(string);
```

Convert a string into a DOM element. The string may have multiple siblings without a common parent, so `stringToElement()` returns a `<div>` containing the elements.

### `documentStringToElement()`

```typescript
export function documentStringToElement(string);
```

Similar to `stringToElement()` but for a `string` which is a whole document, for example, starting `<!DOCTYPE html>`. [`document.adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) is used so that the resulting element belongs to the current `document`.

### `backgroundJob()`

```typescript
export function backgroundJob(
  element,
  elementProperty,
  utilitiesBackgroundJobOptions,
  job,
);
```

This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `backgroundJob()` with the following additions:

1. If called multiple times, this version of `backgroundJob()` `stop()`s the previous background job so that at most one background job is active at any given time.

2. When the `element` is detached from the document, the background job is `stop()`ped. See `isAttached()`.

The background job object which offers the `run()` and `stop()` methods is available at `element[name]`.

See, for example, `relativizeDateTimeElement()`, which uses `backgroundJob()` to periodically update a relative datetime, for example, “2 hours ago”.

### `isAttached()`

```typescript
export function isAttached(element);
```

Check whether the `element` is attached to the document. This is different from the [`isConnected` property](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected) in the following ways:

1. It uses `parents()`, so it supports `tippy()`s that aren’t showing but whose `target`s are attached.

2. You may force an element to be attached by setting `element.isAttached = true` on the `element` itself or on one of its parents.

See, for example, `backgroundJob()`, which uses `isAttached()`.

### `parents()`

```typescript
export function parents(element);
```

Returns an array of parents, including `element` itself. It knows how to navigate up `tippy()`s that aren’t showing.

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
