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

Forms in pages using Live Navigation must not use `<form>`. Instead, they must use `<div type="form">` (in block contexts) or `<span type="form">` (in inline contexts).

> **Reasons**
>
> - `<form>` triggers browser validation, which has some issues, including being too permissive with `<input type="email">` (allowing, for example, `localhost`), being too rigid in custom validation, and so forth. We implement our own validation system in `validate()`.
> - `<form>`’s `method="___"` must be either `"GET"` or `"POST"`, but `<div type="form">` supports any HTTP verb.
> - `<div type="form">` sets the `CSRF-Protection` HTTP header to satisfy [`@radically-straightforward/server`’s CSRF Protection mechanism](https://github.com/radically-straightforward/radically-straightforward/tree/main/server#csrf-protection).
> - `<div type="form">`s may be nested.

> **Example**
>
> ```html
> <div type="form" method="PATCH" action="/">
>   <input type="text" name="example" placeholder="Name…" />
>   <button type="submit">Submit</button>
> </div>
> ```

> **Note:** `<button>`s must have an explicit `type="submit"`.

If the pages include the `<meta name="version" content="___" />` meta tag and the versions differ, then Live Navigation is disabled and the user is alerted to reload the page through an element with `key="global-error"` which you may style.

When loading a new page, a progress bar is displayed on an element with `key="progress-bar"` that is the last child of `<body>`. This element may be styled via CSS.

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

### Add support for the `element.onfocusin` and `element.onfocusout` event handler properties

Unlike most events, browsers don’t support handling the [`focusin`](https://developer.mozilla.org/en-US/docs/Web/API/Element/focusin_event) and [`focusout`](https://developer.mozilla.org/en-US/docs/Web/API/Element/focusout_event) events with `element.onfocusin`/`element.onfocusout` properties—browsers require the use of [`addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener). We add support for these properties, which are convenient because: 1. They bubble, unlike the related [`focus`](https://developer.mozilla.org/en-US/docs/Web/API/Element/focus_event) and [`blur`](https://developer.mozilla.org/en-US/docs/Web/API/Element/blur_event) events; and 2. Setting event handler properties is idempotent, which is required by `javascript="___"` snippets.

<!-- DOCUMENTATION START: ./static/index.mjs -->

### `liveConnection()`

```typescript
export async function liveConnection(
  requestId,
  { reloadOnReconnect = false } = {},
);
```

Open a [Live Connection](https://github.com/radically-straightforward/radically-straightforward/tree/main/server#live-connection) to the server.

If a connection can’t be established, then an error message is shown in an element with `key="global-error"` which you may style.

If the `content` of the meta tag `<meta name="version" content="___" />` has changed, a Live Connection update doesn’t happen. Instead, an error message is shown in an element with `key="global-error"` which you may style.

This function is only meant to be called if:

1. The request in question is not a Live Connection itself.
2. The request method is `GET`.
3. The response status code is 200.

The `reloadOnReconnect` parameter changes the behavior of Live Connections upon the occasional disconnection. When `reloadOnReconnect` is `false` (the default), the client shows an error message to the user and keeps trying to reconnect, which is useful, for example, in case the server malfunctions. When `reloadOnReconnect` is `true`, then as soon as the connection is reestablished, the browser reloads the page, which is useful during development.

**Example**

```typescript
html`
  <!DOCTYPE html>
  <html
    javascript="${javascript`
      if (${
        request.liveConnection === undefined &&
        request.method === "GET" &&
        response.statusCode === 200
      })
        javascript.liveConnection(
          ${request.id}, {
            reloadOnReconnect: ${
              application.configuration.environment === "development"
            }
          }
        );
    `}"
  >
    <head>
      <meta name="version" content="${application.version}" />
    </head>
  </html>
`;
```

### `documentMount()`

```typescript
export function documentMount(
  content,
  { dispatchDOMContentLoaded = true } = {},
);
```

> **Note:** This is a low-level function used by Live Navigation and Live Connection updates.

Similar to `mount()`, but suited for morphing the entire `document`, for example, `documentMount()` dispatches the `DOMContentLoaded` event.

If the `document` and the `content` have `<meta name="version" content="___" />` with different `content`s, then `documentMount()` displays an error message in an element with `key="global-error"` which you may style.

### `mount()`

```typescript
export function mount(element, content);
```

`morph()` the `element` container to include `content`. `execute()` the browser JavaScript in the `element`. Protect the `element` from changing in Live Connection updates.

### `morph()`

```typescript
export function morph(from, to);
```

> **Note:** This is a low-level function—in most cases you want to call `mount()` instead.

Morph the contents of the `from` element into the contents of the `to` element with minimal DOM manipulation by using a diffing algorithm.

Elements may provide a `key="___"` attribute to help identify them with respect to the diffing algorithm. This is similar to [React’s `key`s](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key), but sibling elements may have the same `key` (at the risk of potentially getting them mixed up if they’re reordered).

Elements may define a `state="___"` attribute, typically through the `state___()` functions below, which is not morphed and is meant to include browser state, for example, whether a sidebar is open.

In general, the following attributes aren’t morphed: `state`, `style`, `hidden`, `open`, and `disabled`.

Elements may set a `morph` attribute, which when `false` prevents the element from being morphed. This is useful, for example, for elements that have been `mount()`ed and shouldn’t be removed.

> **Note:** `to` is expected to already belong to the `document`. You may need to call [`importNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode) or [`adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) on a node before passing it to `morph()`. `documentStringToElement()` does that for you.

> **Note:** `to` is mutated destructively in the process of morphing. Create a clone of `to` before passing it into `morph()` if you wish to continue using it.

> **Note:** Elements may define an `onremove()` function, which is called before the element is removed during morphing. This is useful, for example, to prevent leaks of attached `IntersectionObserver`s and `MutationObserver`s by calling [`IntersectionObserver.disconnect()`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/disconnect) and [`MutationObserver.disconnect()`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect).

**Related Work**

`morph()` is different from `from.innerHTML = to.innerHTML` because setting `innerHTML` loses browser state, for example, form inputs, scrolling position, and so forth.

`morph()` is different form [`morphdom`](https://github.com/patrick-steele-idem/morphdom) and its derivatives in the following ways:

- `morph()` deals better with insertions/deletions/moves in the middle of a list. In some situations `morphdom` touches all subsequent elements, while `morph()` tends to only touch the affected elements.

- `morph()` supports `key="___"` instead of `morphdom`’s `id="___"`s. `key`s don’t have to be unique across the document and don’t even have to be unique across the element siblings—they’re just a hint at the identity of the element that’s used in the diffing process.

`morph()` is different from [React](https://react.dev/) in that it works with the DOM, not a Virtual DOM.

### `execute()`

```typescript
export function execute(element);
```

> **Note:** This is a low-level function—in most cases you want to call `mount()` instead.

Execute the functions defined by the `javascript="___"` attribute, which is set by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) when extracting browser JavaScript. You must call this when you insert new elements in the DOM, for example:

```javascript
javascript.execute(
  document
    .querySelector("body")
    .insertAdjacentElement(
      "afterbegin",
      javascript.stringToElement(html`<div javascript="___"></div>`),
    ),
);
```

### `documentStringToElement()`

```typescript
export function documentStringToElement(string);
```

Similar to `stringToElement()` but for a `string` which is a whole document, for example, starting with `<!DOCTYPE html>`. [`document.adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) is used so that the resulting element belongs to the current `document`.

### `stringToElements()`

```typescript
export function stringToElements(string, { svg = false } = {});
```

Convert a string into a DOM element. The string may have multiple siblings without a common parent, so `stringToElements()` returns a `<div>` containing the elements. If `svg` is `true`, then the element is created in the SVG namespace, which is necessary for SVG elements to be drawn by the browser, and the container is an `<svg>` tag instead of a `<div>`.

### `stringToElement()`

```typescript
export function stringToElement(string, options = {});
```

A specialized version of `stringToElements()` for when the `string` is a single element and the wrapper `<div>` is unnecessary.

### `isModified()`

```typescript
export function isModified(
  element,
  { includeSubforms = false, ignoreIsModifiedProperty = false } = {},
);
```

Detects whether there are form fields in `element` and its `children()` that are modified with respect to their `defaultValue` and `defaultChecked` properties.

You may set `element.isModified = <true/false>` to force the result of `isModified()` for `element` and its `children()`.

You may set the `disabled` attribute on a parent element to disable an entire subtree.

`isModified()` powers the “Your changes will be lost if you continue.” dialog that `@radically-straightforward/javascript` enables by default and the part of `morph()` that updates `<input>`s and `<textarea>`s. You may use `isModified()` in features such as only showing an “Update” button in case there is a form input that has been modified.

### `reset()`

```typescript
export function reset(element, { includeSubforms = false } = {});
```

Reset form fields from `element` and its `children()` using their `defaultValue` and `defaultChecked` properties, including dispatching the `input` event.

### `validate()`

```typescript
export function validate(element, { includeSubforms = false } = {});
```

Validate `element` (usually a `<div type="form">`) and its `children()`.

Validation errors are reported with `popover()`s with the `.popover--error` class, which you may style.

You may set the `disabled` attribute on a parent element to disable an entire subtree.

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

### `serialize()`

```typescript
export function serialize(element, { includeSubforms = false } = {});
```

Produce a [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) from the `element` and its `children()`.

You may set the `disabled` attribute on a parent element to disable an entire subtree.

Other than that, `serialize()` follows the behavior of `new FormData(form)`.

### `relativizeDateTimeElement()`

```typescript
export function relativizeDateTimeElement(
  element,
  dateString,
  { capitalize = false, ...relativizeDateTimeOptions } = {},
);
```

Keep an element updated with the relative datetime. See `relativizeDateTime()` (which provides the relative datetime) and `backgroundJob()` (which provides the background job management).

**Example**

```typescript
const date = new Date(Date.now() - 10 * 60 * 60 * 1000);
html`
  <span
    javascript="${javascript`
      javascript.relativizeDateTimeElement(this, ${date.toISOString()});
      javascript.popover({ element: this });
    `}"
  ></span>
  <span
    type="popover"
    javascript="${javascript`
      this.textContent = javascript.localizeDateTime(${date.toISOString()});
    `}"
  ></span>
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

Format a datetime into a representation that is user friendly, for example, `2024-04-03 15:20 UTC`.

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

### `popover()`

```typescript
export function popover({
  element,
  target = element.nextElementSibling,
  trigger = "hover",
  remainOpenWhileFocused = false,
  placement = trigger === "hover"
    ? "top"
    : trigger === "click"
      ? "bottom-start"
      : trigger === "showOnce"
        ? "top"
        : trigger === "none"
          ? "top"
          : (() => {
              throw new Error();
            })(),
  onshow,
  onhide,
});
```

Create a popover (tooltip, dropdown menu, and so forth).

> **Note:** The `target.popoverTriggerElement` property is set to refer to `element`.

**Parameters**

- **`element`:** The element that is used as reference when positioning the popover and that triggers the popover open.

- **`target`:** The element that contains the popover contents. It must have the `type="popover"` type, and it may have one of the `.popover--<color>` classes (see `@radically-straightforward/javascript/static/index.css`). As a special case, if `trigger` is set to `"showOnce"`, then `target` may be a string which is turned into a DOM element by `popover()`.

- **`trigger`:** One of the following:
  - **`"hover"`:** Show the popover on the `element.onmouseenter` or `element.onfocusin` events and hide the popover on the `element.onmouseleave` or `element.onfocusout` events. The `target` must not contain elements that may be focused (for example, `<button>`, `<input>`, and so forth), otherwise keyboard navigation is broken. On `isTouch` devices, `"hover"` popovers don’t show up because they often conflict with `"click"` popovers.

  - **`"click"`:** Show the popover on the `element.onclick` event. When to hide the popover depends on the `remainOpenWhileFocused`. If `remainOpenWhileFocused` is `false` (the default), then the next click anywhere will close the popover—this is useful for dropdown menus with `<button>`s. If `remainOpenWhileFocused` is `true`, then only clicks outside of the popover will close it—this is useful for dropdown menus with `<input>`s. If `remainOpenWhileFocused` is `true` and you need to close the popover programmatically, you may send a `click` event to an element out of the popover, for example, `document.querySelector("body").click()`.

  - **`"showOnce"`:** Show the popover right away, and hide it (and remove it from the DOM) on the next `pointerdown` or `keydown` event.

  - **`"none"`:** Showing and hiding the popover is the responsibility of the caller using the `target.showPopover()` and `target.hidePopover()` functions.

- **`remainOpenWhileFocused`:** See discussion on `trigger: "click"`. This parameter is ignored if `trigger` is something else.

- **`placement`:** One of [Floating UI’s `placement`s](https://floating-ui.com/docs/computePosition#placement).

**Example**

```typescript
html`
  <button
    type="button"
    javascript="${javascript`
      javascript.popover({ element: this });
    `}"
  >
    Example of an element
  </button>
  <div type="popover">Example of a popover.</div>
`;
```

**Implementation notes**

This is inspired by the [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) and [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning), but it doesn’t follow the browser implementation exactly. First, because not all browsers support these APIs yet and the polyfills don’t work well enough (for example, they don’t support `position-try`). Second, because the APIs can be a bit awkward to use, for example, asking for you to come up with `anchor-name`s, and using HTML attributes instead of CSS & JavaScript.

We use [Floating UI](https://floating-ui.com/) for positioning and provide an API reminiscent of the discontinued [Tippy.js](https://atomiks.github.io/tippyjs/). The major difference is that in Tippy.js the `content` is kept out of the DOM while the popover is hidden, while we keep the `target` in the DOM (just hidden). This allows, for example, the popover to contain form fields which are submitted on form submission, and it makes inspecting and debugging easier. We also support fewer features and less customization, for example, there isn’t the concept of `interactive` separate of `trigger`, so you can’t create an interactive `"hover"` popover.

### `parents()`

```typescript
export function parents(element);
```

Returns an array of parents, including `element` itself.

### `children()`

```typescript
export function children(element, { includeSubforms = true } = {});
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

2. When the `element`’s [`isConnected`](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected) is `false`, the background job is `stop()`ped.

The background job object which offers the `run()` and `stop()` methods is available at `element[name]`.

See, for example, `relativizeDateTimeElement()`, which uses `backgroundJob()` to periodically update a relative datetime, for example, “2 hours ago”.

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

### `isTouch`

```typescript
export let isTouch;
```

Whether the device has a touch screen, as opposed to a mouse. This is useful, for example, to disable `popover()`s triggered by `"hover"`. See <https://github.com/atomiks/tippyjs/blob/ad85f6feb79cf6c5853c43bf1b2a50c4fa98e7a1/src/bindGlobalEventListeners.ts#L7-L18>.

<!-- DOCUMENTATION END: ./static/index.mjs -->
