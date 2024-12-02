# Radically Straightforward · JavaScript

**⚙️ Browser JavaScript in [Tagged Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)**

## Installation

```console
$ npm install --save-dev @radically-straightforward/javascript
```

> **Note:** We recommend installing `@radically-straightforward/javascript` as a development dependency because `@radically-straightforward/build` removes the `` javascript`___` `` tagged templates from the server code and bundles the browser JavaScript.

> **Note:** We recommend the **[ES6 String HTML](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** Visual Studio Code extension to syntax highlight browser JavaScript in tagged templates.

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

> **Note:** Browser JavaScript is represented as a string and this tagged template works by performing string interpolation. The substitutions are `JSON.stringify()`ed. This is conceptually simple and fast. To extract and process the browser JavaScript refer to [`@radically-straightforward/build`](https://www.npmjs.com/package/@radically-straightforward/build).

<!-- DOCUMENTATION END: ./source/index.mts -->

## Browser JavaScript

```typescript
css`
  @import "@radically-straightforward/javascript/static/index.css";
`;

javascript`
  import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
`;
```

Importing this module enables the following features:

### Live Navigation

Detect that the user is following a link, submitting a form, or navigating in browser history and overwrite the browser’s default behavior: instead of loading an entire new page, `morph()` the current page into the new one. This speeds up navigation because CSS and browser JavaScript are preserved. Also, it allows for preserving some browser state (for example, scroll position on a sidebar) through careful use of the same `key="___"` attribute across pages.

Live Navigation enhances `<form>`s in the following ways:

- More `method`s are supported, including `PATCH`, `PUT`, `DELETE`, and so forth. This goes beyond the methods `GET` and `POST` that are supported by browsers by default.

- The `CSRF-Protection` HTTP header is set, to satisfy [`@radically-straightforward/server`’s CSRF Protection mechanism](https://github.com/radically-straightforward/radically-straightforward/tree/main/server#csrf-protection).

If the pages include the `<meta name="version" content="___" />` meta tag and the versions differ, then Live Navigation is disabled and the user is alerted to reload the page through an element with `key="global-error"` which you may style.

When loading a new page, a progress bar is displayed on an element with `key="progress-bar"` that is the last child of `<body>`. This element may be styled via CSS.

An `<a>` or `<form>` may opt out of Live Navigation by setting the property `element.liveNavigate = false`.

### Code Execution through the ``javascript="${javascript`___`}"`` Attribute

When the page is loaded, the browser JavaScript in the ``javascript="${javascript`___`}"`` attribute is executed. This is made to work along with the [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) package, which extracts browser JavaScript from the server code.

The browser JavaScript in ``javascript="${javascript`___`}"`` attributes may run on the same element on Live Navigation and on Live Connection updates. If you used something like `addEventListener()` the same event listener would be added repeated. Instead, you should use something like the `onclick` property.

### Custom Form Validation

The default browser form validation is limited in many ways:

- Email verification in `<input type="email" />` is too permissive to be practical, allowing, for example, the email address `example@localhost`, which is technically valid but undesirable.

- Custom validation is awkward to use.

- It isn’t possible to control the style of the error messages.

`@radically-straightforward/javascript` overwrites the default browser behavior and introduces a custom validation mechanism. See `validate()` for more information.

### Warn about Unsaved Changes before Leaving the Page

If the user has filled a form but hasn’t submitted it and they try to leave the page, then `@radically-straightforward/javascript` warns that they will lose data. See `isModified()` for more information.

<!-- DOCUMENTATION START: ./static/index.mjs -->

### `liveConnection()`

```typescript
export async function liveConnection(requestId, { reload = false });
```

Open a [Live Connection](https://github.com/radically-straightforward/radically-straightforward/tree/main/server#live-connection) to the server.

If a connection can’t be established, then an error message is shown in an element with `key="global-error"` which you may style.

If the `content` of the meta tag `<meta name="version" content="___" />` has changed, a Live Connection update doesn’t happen. Instead, an error message is shown in an element with `key="global-error"` which you may style.

If `reload` is `true` then the page reloads when the connection is closed and reopened, because presumably the server has been restarted after a code modification during development.

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

Similar to `mount()`, but suited for morphing the entire `document`. For example, it dispatches the `event` to the `window`.

If the `document` and the `content` have `<meta name="version" content="___" />` with different `content`s, then `documentMount()` displays an error message in an element with `key="global-error"` which you may style.

### `morph()`

```typescript
export function morph(from, to, event = undefined);
```

> **Note:** This is a low-level function—in most cases you want to call `mount()` instead.

Morph the contents of the `from` element into the contents of the `to` element with minimal DOM manipulation by using a diffing algorithm.

Elements may provide a `key="___"` attribute to help identify them with respect to the diffing algorithm. This is similar to [React’s `key`s](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key), but sibling elements may have the same `key` (at the risk of potentially getting them mixed up if they’re reordered).

Elements may define a `state="___"` attribute, typically through the `state___()` methods below, which is not morphed on Live Connection updates, and is meant to include browser state, for example, whether a sidebar is open.

When `morph()` is called to perform a Live Connection update (that is,`event?.detail?.liveConnectionUpdate` is `true`), elements may set a `liveConnectionUpdate` attribute, which controls the behavior of `morph()` in the following ways:

- When `from.liveConnectionUpdate` is `false`, `morph()` doesn’t do anything. This is useful for elements which contain browser state that must be preserved on Live Connection updates, for example, the container of dynamically-loaded content (see `mount()`).

- When `from.liveConnectionUpdate` or any of `from`’s parents is `new Set(["state", "style", "hidden", "open", "disabled", "value", "checked"])` or any subset thereof, the mentioned attributes and properties are updated even in a Live Connection update (normally these attributes and properties represent browser state and are skipped in Live Connection updates). This is useful, for example, for forms with hidden fields which must be updated by the server.

- When `fromChildNode.liveConnectionUpdate` is `false`, `morph()` doesn’t remove that `fromChildNode` even if it’s missing among `to`’s child nodes. This is useful for elements that should remain on the page but wouldn’t be sent by the server again in a Live Connection update, for example, an indicator of unread messages.

> **Note:** `to` is expected to already belong to the `document`. You may need to call [`importNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode) or [`adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) on a node before passing it to `morph()`. `documentStringToElement()` does that for you.

> **Note:** `to` is mutated destructively in the process of morphing. Create a clone of `to` before passing it into `morph()` if you wish to continue using it.

**Related Work**

`morph()` is different from `from.innerHTML = to.innerHTML` because setting `innerHTML` loses browser state, for example, form inputs, scrolling position, and so forth.

`morph()` is different form [`morphdom`](https://github.com/patrick-steele-idem/morphdom) and its derivatives in the following ways:

- `morph()` deals better with insertions/deletions/moves in the middle of a list. In some situations `morphdom` touches all subsequent elements, while `morph()` tends to only touch the affected elements.

- `morph()` supports `key="___"` instead of `morphdom`’s `id="___"`s. `key`s don’t have to be unique across the document and don’t even have to be unique across the element siblings—they’re just a hint at the identity of the element that’s used in the diffing process.

- `morph()` is aware of Live Connection updates, `tippy()`s, and so forth.

### `stateAdd()`

```typescript
export function stateAdd(element, token);
```

Add a `token` to the `state="___"` attribute

The `state="___"` attribute is meant to be used to hold browser state, for example, whether a sidebar is open.

The `state="___"` attribute is similar to the `class="___"` attribute, and the `state___()` functions are similar to the [`classList` property](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList). The main difference is that `morph()` preserves `state="___"` on Live Connection updates.

The `state="___"` attribute is different from the `style="___"` attribute in that `state="___"` contains `token`s which may be addressed in CSS with the `[state~="___"]` selector and `style="___"` contains CSS directly.

### `stateRemove()`

```typescript
export function stateRemove(element, token);
```

See `stateAdd()`.

### `stateToggle()`

```typescript
export function stateToggle(element, token);
```

See `stateAdd()`.

### `stateContains()`

```typescript
export function stateContains(element, token);
```

See `stateAdd()`.

### `execute()`

```typescript
export function execute(element, event = undefined);
```

> **Note:** This is a low-level function—in most cases you want to call `mount()` instead.

Execute the functions defined by the `javascript="___"` attribute, which is set by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) when extracting browser JavaScript. You must call this when you insert new elements in the DOM, for example, when mounting content.

### `popover()`

```typescript
export function popover(
  element,
  target = element.nextElementSibling,
  {
    trigger = "hover",
    closeOnFirstSubsequentClick = true,
    placement = trigger === "hover"
      ? "top"
      : trigger === "click"
        ? "bottom-start"
        : trigger === "none"
          ? "top"
          : (() => {
              throw new Error();
            })(),
  },
);
```

TODO

### `tippy()`

```typescript
export function tippy({
  event = undefined,
  element,
  elementProperty = "tippy",
  content,
  ...tippyProps
});
```

Create a [Tippy.js](https://atomiks.github.io/tippyjs/) tippy. This is different from calling Tippy’s constructor for the following reasons:

1. If `tippy()` is called multiple times on the same `element` with the same `elementProperty`, then it doesn’t create new tippys but `mount()`s the `content`.

2. The defaults are different:

   - **`ignoreAttributes`:** Set to `true` because we active `tippy()` via JavaScript, not HTML `data` attributes.

   - **`arrow`:** Set to `false`, because most user interface `tippy()`s don’t use an arrow.

   - **`offset`:** Set to `[0, 0]`, because `arrow` has been set to `false` so it doesn’t make sense to distance the `tippy()` from the trigger.

   - **`touch`:** Set is only set to `true` by default if:

     - `interactive` is set to `true`, because most noninteractive `tippy()`s don’t work well on touch devices (see https://atomiks.github.io/tippyjs/v6/misc/#touch-devices), but most interactive `tippy()`s work well on touch devices (usually they’re menus).

     - `trigger` is set to `"manual"`, because we understand it to mean that you want to control the showing of the `tippy()` programmatically.

   - **`hideOnClick`:** Set to `false` if `trigger` is `"manual"`, because we understand it to mean that you want to control the showing of the `tippy()` programmatically.

   - **`duration`:** Respect `prefers-reduced-motion: reduce` by default.

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

### `stringToElements()`

```typescript
export function stringToElements(string);
```

Convert a string into a DOM element. The string may have multiple siblings without a common parent, so `stringToElements()` returns a `<div>` containing the elements.

### `stringToElement()`

```typescript
export function stringToElement(string);
```

A specialized version of `stringToElements()` for when the `string` is a single element and the wrapper `<div>` is unnecessary.

### `documentStringToElement()`

```typescript
export function documentStringToElement(string);
```

Similar to `stringToElement()` but for a `string` which is a whole document, for example, starting with `<!DOCTYPE html>`. [`document.adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) is used so that the resulting element belongs to the current `document`.

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
