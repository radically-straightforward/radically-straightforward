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
- Tippy.js configuration.
- `execute()`.

<!-- DOCUMENTATION START: ./static/index.mjs -->

### `validate()`

```typescript
export function validate(element);
```

Validate `element` (usually a `<form>`) and its `children()`.

Validation errors are reported with Tippy.js tippys with the `error` theme.

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

1. It uses `parents()`, so it supports Tippy.js’s tippys that aren’t mounted but whose `target`s are attached.

2. You may force an element to be attached by setting `element.isAttached = true` on the `element` itself or on one of its parents.

See, for example, `backgroundJob()`, which uses `isAttached()`.

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
