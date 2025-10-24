# Changelog

## 4.0.27 · 2025-10-24

- Make `onsubmit()` `async`.

## 4.0.26 · 2025-09-23

- Fixed the behavior of “Your changes will be lost if you continue.”

## 4.0.25 · 2025-09-18

- Fixed the behavior of `isModified()` such that using the property `___.isModified = false` doesn’t override the output of parent elements.

## 4.0.24 · 2025-09-11

- Fixed issue in which `___.isModified = false` caused `morph()` to overwrite `value`s on Live Connection updates.

## 4.0.21 · 2025-07-24

- Added cache to Live Navigation.

## 4.0.20 · 2025-06-02

- Fixed Live Navigation with `#anchor`s.

## 4.0.18 · 2025-05-08

- Added support for external redirects in Live Navigation.

## 4.0.17 · 2025-05-05

- Improved the treatment of forms that needs to submit to an external page, for example, for a SAML sign-out workflow.

## 4.0.16 · 2025-03-12

- On `popover()`, added `onshow` and `onhide` parameters.

## 4.0.15 · 2025-02-11

- Added support for SVG elements in `stringToElements()`/`stringToElement()`.

## 4.0.14 · 2025-01-26

- In `serialize()`, added support for `<input type="file">`.
- **Breaking change:** In `validate()`, removed `.isValid` property.

## 4.0.12 · 2025-01-21

- On `popover()`, added the `trigger: "showOnce"` option.

## 4.0.11 · 2025-01-20

- Fixed `isModified()` such that an outer element with a `.isModified` property takes priority.
- On `morph()` added the `name="___"` attribute as part of the `key`, which prevents `<input>`s and `<textarea>` from getting mixed up in Live Navigation.

## 4.0.10 · 2025-01-18

- Fixed issues in `popover()`:
  - A popover that had been left behind would contribute to the size of the scrolling container.
  - A popover could reach an unopenable state if activated and deactivated in fast succession, particularly when Live Navigating across pages.

## 4.0.9 · 2025-01-10

- Added `onsubmit()` event to form submission via Live Navigation.

## 4.0.8 · 2025-01-07

- **Breaking change:** Removed `stateContains()`. Use `element.matches('[state~="___"]')` instead.
- **Breaking change:** `morph()` now doesn’t include special cases for Live Connection updates. Instead, there’s a new `morph` attribute which, when set to `false`, prevents morphing.
- **Breaking change:** Removed the `event` parameter from many functions, for example, `execute()`, `morph()` and so forth.
- **Breaking change:** Removed the `event` parameter from JavaScript extracted from `javascript="___"` attributes. Compatible with `@radically-straightforward/build@2.0.7`.

## 4.0.1 · 2024-12-09

- **Breaking change:** `class="popover"` is now `type="popover"`, for consistency with `type="form"`. This breaking change is small enough and the release of `popover()` has been recent enough that we aren’t doing a major release.

## 4.0.0 · 2024-12-08

- **Breaking change:** Added support for nested forms, which requires replacing `<form>` tags with `<div type="form">`, because HTML parsers don’t support nested `<form>` tags.
- Improved the treatment of Live Navigation when the user tries to navigate while a Live Navigation is already underway.
- Improved the treatment of Live Connection updates on `<input>`s: Live Connection updates may always update the `value="___"` and `checked=""` attributes, which correspond to the `defaultValue` and `defaultChecked` properties.

## 3.0.3 · 2024-12-07

- Changed `reset()` so that it dispatches the `input` and `change` events appropriately (including bubbling).

## 3.0.0 · 2024-12-05

- **Breaking change:** Removed `tippy()`. Use `popover()`.
- **Breaking change:** Removed `isAttached`. Use [`contains()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/contains) or [`isConnected`](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected).
- **Breaking change:** Changed `relativizeDateTimeElement()`. It now has a new signature and it no longer sets up a popover with the original date—it’s the caller’s responsibility to do that.
- **Breaking change:** Changed `parents()` such that it no longer checks that `element.nodeType === element.ELEMENT_NODE`. You must not call `parents()` with a node that isn’t an element.
- **Breaking change:** Changed `children()` such that it no longer checks that `element !== null`. You must not call `children()` with `null`.
- Added `stateContains()`.
- Added support for `element.onfocusin` and `element.onfocusout` event handler properties.

## 2.0.0 · 2024-11-19

- **Breaking Change:** Renamed `stringToElement()` into `stringToElements()` and created a new specialized version of `stringToElements()` called `stringToElement()` for when the given `string` is a single element and the `<div>` wrapper is unnecessary.
- Changed `execute()` in two ways:
  1. It executes `javascript="___"` of the `element` on which it’s called, consistent with `morph()`, which morphs the attributes of the `element` on which it’s called.
  2. It returns the `element`, to make it more convenient (fluent interface), particularly when used in conjunction with `stringToElement()` and `insertAdjacentElement()`.

## 1.0.11 · 2024-11-05

- Added the notion of `state="___"` to hold browser state. This affects `morph()` and introduces the `stateAdd()`, `stateRemove()`, and `stateToggle()` functions.

## 1.0.10 · 2024-06-18

- Fixed the treatment of `<input type="checkbox">` and `<input type="radio">` in `isModified()`.

## 1.0.9 · 2024-06-11

- Changed the defaults for `tippy()`.

## 1.0.7 · 2024-06-09

- **Important Change:** `@radically-straightforward/javascript/static/index.css` now `@import`s `@radically-straightforward/css/static/index.css`, so you don’t need to import it by hand.
- Fixed the presentation of `global-error`.

## 1.0.6 · 2024-06-09

- Changed defaults for Tippy and progress bar appearance.

## 1.0.5 · 2024-06-03

- Fixed an issue with `<form>`s whose `method` weren’t `GET` or `POST`.

## 1.0.4 · 2024-05-29

- Changed `morph()` such that it morphs the attributes of the element with which it was called, not only its children.

## 1.0.3 · 2024-05-06

- Removed support for `maxlength`, because the browser doesn’t allow inputting more than that anyway.

## 1.0.2 · 2024-05-06

- Added support for `maxlength`.

## 1.0.1 · 2024-05-03

- Changed `javascript.configuration.environment` into a parameter passed to `liveConnection()`.

## 1.0.0 · 2024-04-28

- The first usable release, including all the features of browser JavaScript.

## 0.0.1 · 2024-03-17

- Initial release with tagged template. Only the basics necessary to develop `@radically-straightforward/build`.
