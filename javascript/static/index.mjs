import * as utilities from "@radically-straightforward/utilities";
import fastMyersDiff from "fast-myers-diff";
import tippy, * as tippyStatic from "tippy.js";

// TODO: Do we want a method to combine `validate()`, `serialize()`, and a `fetch()` to submit the form?

// export function liveNavigation() {
//   let abortController;
//   let previousLocation = { ...window.location };

//   const liveNavigate = async ({ request, event }) => {
//     const body = document.querySelector("body");

//     if (event instanceof PopStateEvent) abortController?.abort();
//     else if (body.getAttribute("live-navigation") !== null) return;

//     request.headers.set("Live-Navigation", "true");

//     const isGet = ["GET", "HEAD", "OPTIONS", "TRACE"].includes(request.method);
//     if (!isGet) request.headers.set("CSRF-Protection", "true");

//     const requestURL = new URL(request.url);
//     const detail = { request, previousLocation };
//     if (
//       isGet &&
//       previousLocation.origin === requestURL.origin &&
//       previousLocation.pathname === requestURL.pathname &&
//       previousLocation.search === requestURL.search
//     ) {
//       if (
//         previousLocation.hash !== requestURL.hash &&
//         !(event instanceof PopStateEvent)
//       )
//         window.history.pushState(undefined, "", requestURL.href);
//       window.dispatchEvent(new CustomEvent("livenavigateself", { detail }));
//       if (window.location.hash.trim() !== "")
//         document
//           .getElementById(window.location.hash.slice(1))
//           ?.scrollIntoView();
//       previousLocation = { ...window.location };
//       return;
//     }

//     if (window.onbeforelivenavigate?.() === false) return;
//     body.setAttribute("live-navigation", "true");
//     window.dispatchEvent(new CustomEvent("livenavigate", { detail }));
//     window.onlivenavigate?.();

//     try {
//       abortController = new AbortController();
//       const response = await fetch(request, {
//         cache: "no-store",
//         signal: abortController.signal,
//       });

//       const externalRedirect = response.headers.get(
//         "Live-Navigation-External-Redirect",
//       );
//       if (typeof externalRedirect === "string") {
//         window.location.assign(externalRedirect);
//         return;
//       }

//       const responseText = await response.text();
//       const responseURL = new URL(response.url);
//       responseURL.hash = requestURL.hash;

//       if (
//         (isGet ||
//           window.location.origin !== responseURL.origin ||
//           window.location.pathname !== responseURL.pathname ||
//           window.location.search !== responseURL.search) &&
//         (!(event instanceof PopStateEvent) ||
//           requestURL.origin !== responseURL.origin ||
//           requestURL.pathname !== responseURL.pathname ||
//           requestURL.search !== responseURL.search)
//       )
//         window.history.pushState(undefined, "", responseURL.href);

//       loadDocument(responseText, { detail });

//       if (window.location.hash.trim() !== "")
//         document
//           .getElementById(window.location.hash.slice(1))
//           ?.scrollIntoView();
//     } catch (error) {
//       if (error.name !== "AbortError") {
//         console.error(error);

//         if (isGet && !(event instanceof PopStateEvent))
//           window.history.pushState(undefined, "", requestURL.href);

//         setTippy({
//           event,
//           element: body,
//           elementProperty: "liveNavigationErrorTooltip",
//           tippyProps: {
//             appendTo: body,
//             trigger: "manual",
//             hideOnClick: false,
//             theme: "error",
//             arrow: false,
//             interactive: true,
//             content:
//               "Something went wrong when trying to perform this action. Please try reloading the page.",
//           },
//         });
//         body.liveNavigationErrorTooltip.show();

//         window.onlivenavigateerror?.();
//       }
//     }

//     previousLocation = { ...window.location };
//     body.removeAttribute("live-navigation");
//   };

//   window.addEventListener("DOMContentLoaded", (event) => {
//     execute({
//       event,
//       elements: [...document.querySelectorAll("[javascript]")].filter(
//         (element) =>
//           element.closest("[data-tippy-root]") === null &&
//           !parents(element)
//             .slice(1)
//             .some((element) => element.partialParentElement),
//       ),
//     });
//   });

//   document.onclick = async (event) => {
//     const link = event.target.closest(
//       'a[href]:not([target^="_"]):not([download])',
//     );
//     if (
//       event.button !== 0 ||
//       event.altKey ||
//       event.ctrlKey ||
//       event.metaKey ||
//       event.shiftKey ||
//       event.target.isContentEditable ||
//       link === null ||
//       link.hostname !== window.location.hostname ||
//       link.onbeforelivenavigate?.() === false
//     )
//       return;

//     event.preventDefault();
//     liveNavigate({ request: new Request(link.href), event });
//   };

//   document.onsubmit = async (event) => {
//     if (
//       event.submitter?.onbeforelivenavigate?.() === false ||
//       event.target.onbeforelivenavigate?.() === false
//     )
//       return;

//     const method = (
//       event.submitter?.getAttribute("formmethod") ??
//       event.target.getAttribute("method")
//     ).toUpperCase();
//     const action =
//       event.submitter?.getAttribute("formaction") ?? event.target.action;
//     if (new URL(action).hostname !== window.location.hostname) return;
//     const enctype =
//       event.submitter?.getAttribute("formenctype") ?? event.target.enctype;
//     const body =
//       enctype === "multipart/form-data"
//         ? new FormData(event.target)
//         : new URLSearchParams(new FormData(event.target));
//     const submitterName = event.submitter?.getAttribute("name");
//     if (typeof submitterName === "string")
//       body.set(submitterName, event.submitter?.value ?? "");

//     event.preventDefault();

//     const request = ["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)
//       ? (() => {
//           const actionURL = new URL(action);
//           for (const [name, value] of body)
//             actionURL.searchParams.append(name, value);
//           return new Request(actionURL.href, { method });
//         })()
//       : new Request(action, { method, body });
//     liveNavigate({ request, event });
//   };

//   window.onpopstate = async (event) => {
//     liveNavigate({
//       request: new Request(window.location),
//       event,
//     });
//   };
// }

// TODO: Test `execute()` within a tippy.

/**
 * Execute the functions defined by the `javascript="___"` attribute, which is set by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) when extracting browser JavaScript. You must call this when you insert new elements in the DOM, for example, when loading a partial.
 */
export function execute({
  event = undefined,
  element = undefined,
  elements = element.querySelectorAll("[javascript]"),
}) {
  for (const element of elements) {
    const javascript = JSON.parse(element.getAttribute("javascript"));
    execute.functions
      .get(javascript.function)
      .call(element, event, ...javascript.arguments);
  }
}
execute.functions = new Map();

// export async function liveConnection({
//   nonce,
//   newServerVersionMessage = "There has been an update. Please reload the page.",
//   offlineMessage = "Failed to connect. Please check your internet connection and try reloading the page.",
//   environment = "production",
//   reconnectTimeout = environment === "development" ? 200 : 5 * 1000,
//   liveReload = environment === "development",
// }) {
//   const body = document.querySelector("body");
//   const serverVersion = document
//     .querySelector('meta[name="version"]')
//     ?.getAttribute("content");
//   let inLiveNavigation = false;
//   let heartbeatTimeout;
//   let abortController;
//   let liveReloadOnNextConnection = false;

//   window.addEventListener(
//     "livenavigate",
//     () => {
//       inLiveNavigation = true;
//       clearTimeout(heartbeatTimeout);
//       abortController.abort();
//     },
//     { once: true },
//   );

//   while (true) {
//     heartbeatTimeout = window.setTimeout(() => {
//       abortController.abort();
//     }, 50 * 1000);
//     abortController = new AbortController();

//     let connected = false;

//     try {
//       const response = await fetch(window.location.href, {
//         headers: { "Live-Connection": nonce },
//         cache: "no-store",
//         signal: abortController.signal,
//       });

//       if (response.status === 422) {
//         console.error(response);
//         setTippy({
//           element: body,
//           elementProperty: "liveConnectionValidationErrorTooltip",
//           tippyProps: {
//             appendTo: body,
//             trigger: "manual",
//             hideOnClick: false,
//             theme: "error",
//             arrow: false,
//             interactive: true,
//             content:
//               "Failed to connect to server. Please try reloading the page.",
//           },
//         });
//         body.liveConnectionValidationErrorTooltip.show();
//         return;
//       }
//       if (!response.ok) throw new Error("Response isn’t OK");

//       connected = true;
//       body.liveConnectionOfflineTooltip?.hide();

//       const newServerVersion = response.headers.get("Version");
//       if (
//         typeof serverVersion === "string" &&
//         typeof newServerVersion === "string" &&
//         serverVersion !== newServerVersion
//       ) {
//         console.error(
//           `NEW SERVER VERSION: ${serverVersion} → ${newServerVersion}`,
//         );
//         setTippy({
//           element: body,
//           elementProperty: "liveConnectionNewServerVersionTooltip",
//           tippyProps: {
//             appendTo: body,
//             trigger: "manual",
//             hideOnClick: false,
//             theme: "error",
//             arrow: false,
//             interactive: true,
//             content: newServerVersionMessage,
//           },
//         });
//         body.liveConnectionNewServerVersionTooltip.show();
//         return;
//       }

//       if (liveReloadOnNextConnection) {
//         body.isModified = false;
//         await new Promise((resolve) => {
//           window.setTimeout(resolve, 300);
//         });
//         location.reload();
//         return;
//       }

//       const responseBodyReader = response.body.getReader();
//       const textDecoder = new TextDecoder();
//       let buffer = "";
//       while (true) {
//         const chunk = (await responseBodyReader.read()).value;
//         if (chunk === undefined) break;
//         clearTimeout(heartbeatTimeout);
//         heartbeatTimeout = window.setTimeout(() => {
//           abortController.abort();
//         }, 50 * 1000);
//         buffer += textDecoder.decode(chunk, { stream: true });
//         const bufferParts = buffer.split("\n");
//         buffer = bufferParts.pop();
//         const bufferPart = bufferParts
//           .reverse()
//           .find((bufferPart) => bufferPart.trim() !== "");
//         if (bufferPart === undefined) continue;
//         const bufferPartJSON = JSON.parse(bufferPart);
//         if (inLiveNavigation) return;
//         loadDocument(bufferPartJSON, {
//           detail: {
//             previousLocation: { ...window.location },
//             liveConnectionUpdate: true,
//           },
//         });
//       }
//     } catch (error) {
//       if (inLiveNavigation) return;

//       console.error(error);

//       if (!connected) {
//         setTippy({
//           element: body,
//           elementProperty: "liveConnectionOfflineTooltip",
//           tippyProps: {
//             appendTo: body,
//             trigger: "manual",
//             hideOnClick: false,
//             theme: "error",
//             arrow: false,
//             interactive: true,
//             content: liveReload ? "Live-Reloading…" : offlineMessage,
//           },
//         });
//         body.liveConnectionOfflineTooltip.show();
//       }
//     } finally {
//       clearTimeout(heartbeatTimeout);
//       abortController.abort();
//     }

//     nonce = Math.random().toString(36).slice(2);
//     liveReloadOnNextConnection = liveReload;

//     await new Promise((resolve) => {
//       window.setTimeout(
//         resolve,
//         reconnectTimeout + Math.random() * reconnectTimeout * 0.2,
//       );
//     });
//   }
// }

// export function loadDocument(documentString, event) {
//   if (!event?.detail?.liveConnectionUpdate) tippyStatic.hideAll();

//   morph(
//     document.querySelector("html"),
//     new DOMParser()
//       .parseFromString(documentString, "text/html")
//       .querySelector("html"),
//     event,
//   );

//   window.dispatchEvent(
//     new CustomEvent("DOMContentLoaded", { detail: event?.detail }),
//   );

//   if (!event?.detail?.liveConnectionUpdate)
//     document.querySelector("[autofocus]")?.focus();
// }

// export function loadPartial(parentElement, partialString) {
//   morph(parentElement, partialString);

//   parentElement.partialParentElement = true; // TODO: Change this into parentElement.onbeforemorph = (event) => !event?.detail?.liveConnectionUpdate;
//   parentElement.isAttached = true;
//   execute({ element: parentElement });
//   const parentElementTippy = parentElement.closest("[data-tippy-root]")?._tippy;
//   if (parentElementTippy !== undefined)
//     parentElementTippy.setContent(parentElementTippy.props.content);
//   parentElement.isAttached = false;
// }

// TODO: Test `morph()` within a tippy.
/**
 * Morph the contents of the `from` container element into the contents of the `to` container element with minimal DOM manipulation by using a diffing algorithm.
 * 
 * If the `to` element is a string, then it’s converted with `stringToElement()`.
 * 
 * Elements may provide a `key="___"` attribute to help identify them with respect to the diffing algorithm. This is similar to [React’s `key`s](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key), but sibling elements may have the same `key` (at the risk of potentially getting them mixed up if they’re reordered).
 * 
 * The `event` is forwarded into event listeners, for example, `onmorph()`.
 * 
 * The `from` element may provide the `from.onmorph = (event) => { ___ };` event listener, which is called before morphing and may prevent it by returning `false`. This is useful for elements that have client-side state that must be preserved, for example, a lazily-loaded partial.
 * 
 * The children of the `from` element may provide the `fromChildNode.onmorphremove = (event) => { ___ };` event listener, which is called before a removal and may prevent it by returning `false`. This is useful for elements that should remain on the page but wouldn’t be sent by server again in a Live Connection update, for example, an indicator of unread messages.
 * 
 * Elements and their parents may provide the `element.onmorphattribute = (event, attribute) => { ___ };` event listener, which is called before morphing an attribute. TODO
 * 
 * **Related Work**
 * 
 * This is different from `from.innerHTML = to.innerHTML` because the elements are compared and only the minimal amount of DOM operations are performed, which helps preserve client-side state, for example, scrolling position, caret position, and so forth.
 * 
 * This is different form [`morphdom`](https://github.com/patrick-steele-idem/morphdom) and its derivatives in the following ways:
 * 
 * - `morph()` deals better with insertions/deletions/moves in the middle of a list. In some situations `morphdom` will touch all subsequent elements, while `morph()` tends to only touch the affected elements.
 * 
 * - `morph()` supports `key="___"` instead of `morphdom`’s `id="___"`s. `key`s don’t have to be unique across the document and don’t even have to be unique across the element siblings—they’re just a hint at the identity of the element that’s used in the diffing process.
 * 
 * - `morph()` preserves the `to` element, while `morphdom` modifies it in a destructive way.
 */
export function morph(from, to, event = undefined) {
  if (from.onmorph?.(event) === false) return;
  if (typeof to === "string") to = stringToElement(to);
  const key = (node) => ({
    node,
    key: `${node.nodeType}--${
      node.nodeType === node.ELEMENT_NODE
        ? `${node.tagName}--${node.getAttribute("key")}`
        : node.nodeValue
    }`,
  });
  const fromChildNodes = [...from.childNodes].map(key);
  const toChildNodes = [...to.childNodes].map(key);
  const diff = [
    [0, 0, 0, 0],
    ...fastMyersDiff.diff(
      fromChildNodes.map(({ key }) => key),
      toChildNodes.map(({ key }) => key),
    ),
    [
      fromChildNodes.length,
      fromChildNodes.length,
      toChildNodes.length,
      toChildNodes.length,
    ],
  ].map(([fromStart, fromEnd, toStart, toEnd]) => ({
    from: { start: fromStart, end: fromEnd },
    to: { start: toStart, end: toEnd },
  }));
  const toRemove = new Set();
  for (const diffEntry of diff)
    for (const fromChildNode of fromChildNodes.slice(
      diffEntry.from.start,
      diffEntry.from.end,
    ))
      if (
        fromChildNode.node.onmorphremove?.(event) !== false &&
        !(
          event?.detail?.liveConnectionUpdate &&
          fromChildNode.node.matches?.("[data-tippy-root]")
        )
      )
        toRemove.add(fromChildNode);
  const toAdd = new Set();
  const toMorph = new Set();
  for (let diffIndex = 1; diffIndex < diff.length; diffIndex++) {
    const previousDiffEntry = diff[diffIndex - 1];
    const diffEntry = diff[diffIndex];
    for (
      let nodeIndexOffset = 0;
      nodeIndexOffset < diffEntry.from.start - previousDiffEntry.from.end;
      nodeIndexOffset++
    )
      toMorph.add({
        from: fromChildNodes[previousDiffEntry.from.end + nodeIndexOffset].node,
        to: toChildNodes[previousDiffEntry.to.end + nodeIndexOffset].node,
      });
    for (const toChildNode of toChildNodes.slice(
      diffEntry.to.start,
      diffEntry.to.end,
    )) {
      const fromChildNode = [...toRemove].find(
        (fromChildNode) => toChildNode.key === fromChildNode.key,
      );
      if (fromChildNode !== undefined) {
        toRemove.delete(fromChildNode);
        toMorph.add({ from: fromChildNode.node, to: toChildNode.node });
      }
      toAdd.add({
        node:
          fromChildNode?.node ?? document.importNode(toChildNode.node, true),
        nodeAfter: fromChildNodes[diffEntry.from.end]?.node ?? null,
      });
    }
  }
  for (const { node } of toRemove) from.removeChild(node);
  for (const { node, nodeAfter } of toAdd) from.insertBefore(node, nodeAfter);
  for (const { from, to } of toMorph) {
    if (from.nodeType !== from.ELEMENT_NODE) continue;
    for (const attribute of new Set([
      ...from.getAttributeNames(),
      ...to.getAttributeNames(),
      ...(from.matches("input, textarea") ? ["value", "checked"] : []),
    ])) {
      if (
        parents(from).some(
          (element) => element.onmorphattribute?.(event, attribute) === true,
        ) ||
        (event?.detail?.liveConnectionUpdate &&
          (attribute === "style" ||
            attribute === "hidden" ||
            attribute === "disabled" ||
            attribute === "value" ||
            attribute === "checked"))
      )
        continue;
      if (to.getAttribute(attribute) === null) from.removeAttribute(attribute);
      else if (from.getAttribute(attribute) !== to.getAttribute(attribute))
        from.setAttribute(attribute, to.getAttribute(attribute));
      if (
        (attribute === "value" || attribute === "checked") &&
        from[attribute] !== to[attribute]
      )
        from[attribute] = to[attribute];
    }
    morph(from, to, event);
  }
}

/**
 * Create a Tippy.js tippy. This is different from calling Tippy’s constructor in the following ways:
 *
 * 1. If called multiple times on the same `element` with the same `elementProperty`, then `setTippy()` doesn’t create new tippys, but `morph()`s the tippy contents.
 *
 * 2. `setTippy()` `execute()`s the contents of the tippy.
 */
export function setTippy({
  event = undefined,
  element,
  elementProperty = "tooltip",
  tippyProps: { content: tippyContent, ...tippyProps },
}) {
  element[elementProperty] ??= tippy(element, {
    content: document.createElement("div"),
  });
  element[elementProperty].setProps(tippyProps);
  morph(element[elementProperty].props.content, tippyContent, event);
  execute({ event, element: element[elementProperty].props.content });
  return element[elementProperty];
}
tippy.setDefaultProps({
  arrow: tippyStatic.roundArrow + tippyStatic.roundArrow,
  duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 1
    : 150,
});

/**
 * Validate `element` (usually a `<form>`) and its `children()`.
 *
 * Validation errors are reported with Tippy.js tippys with the `error` theme.
 *
 * Use `<form novalidate>` to disable the native browser validation, which is too permissive on email addresses, is more limited in custom validation, and so forth.
 *
 * You may set the `disabled` attribute on a parent element to disable an entire subtree.
 *
 * Use `element.isValid = true` to force a subtree to be valid.
 *
 * `validate()` supports the `required` and `minlength` attributes, the `type="email"` input type, and custom validation.
 *
 * For custom validation, use the `onvalidate` event and `throw new ValidationError()`, for example:
 *
 * ```javascript
 * html`
 *   <input
 *     type="text"
 *     name="name"
 *     required
 *     javascript="${javascript`
 *       this.onvalidate = () => {
 *         if (this.value !== "Leandro")
 *           throw new javascript.ValidationError("Invalid name.");
 *       };
 *     `}"
 *   />
 * `;
 * ```
 *
 * `validate()` powers the custom validation that `@radically-straightforward/javascript` enables by default.
 */
export function validate(element) {
  const elements = children(element);
  for (const element of elements) {
    if (
      !element.matches("input, textarea") ||
      element.closest("[disabled]") !== null ||
      parents(element).some((element) => element.isValid === true)
    )
      continue;
    try {
      if (element.matches("[required]")) {
        if (
          element.value.trim() === "" ||
          ((element.type === "radio" || element.type === "checkbox") &&
            element
              .closest("form")
              .querySelector(`[name="${element.name}"]:checked`) === null)
        )
          throw new ValidationError("Required.");
      }
      if (element.value.trim() === "") continue;
      if (
        element.matches("[minlength]") &&
        element.value.length < Number(element.getAttribute("minlength"))
      )
        throw new ValidationError(
          `Minimum ${element.getAttribute("minlength")} characters.`,
        );
      if (
        element.matches(`[type="email"]`) &&
        element.value.match(utilities.emailRegExp) === null
      )
        throw new ValidationError("Invalid email.");
      element.onvalidate?.();
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      const target =
        element.closest(
          "[hidden], .visually-hidden, .visually-hidden--interactive:not(:focus):not(:focus-within):not(:active)",
        )?.parentElement ?? element;
      setTippy({
        element: target,
        elementProperty: "validationErrorTooltip",
        tippyProps: {
          theme: "error",
          trigger: "manual",
          content: error.message,
        },
      }).show();
      target.focus();
      return false;
    }
  }
  return true;
}
document.addEventListener(
  "submit",
  (event) => {
    if (validate(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  { capture: true },
);

/**
 * Custom error class for `validate()`.
 */
export class ValidationError extends Error {}

/**
 * Validate a form field that used `localizeDateTime()`. The error is reported on the `element`, but the UTC datetime that must be sent to the server is returned as a string that must be assigned to another form field, for example:
 *
 * ```javascript
 * html`
 *   <input type="hidden" name="datetime" value="${new Date().toISOString()}" />
 *   <input
 *     type="text"
 *     required
 *     javascript="${javascript`
 *       this.value = javascript.localizeDateTime(this.previousElementSibling.value);
 *       this.onvalidate = () => {
 *         this.previousElementSibling.value = javascript.validateLocalizedDateTime(this);
 *       };
 *     `}"
 *   />
 * `;
 * ```
 */
export function validateLocalizedDateTime(element) {
  if (element.value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/) === null)
    throw new ValidationError("Match the pattern YYYY-MM-DD HH:MM.");
  const date = new Date(element.value.trim().replace(" ", "T"));
  if (isNaN(date.getTime())) throw new ValidationError("Invalid datetime.");
  return date.toISOString();
}

/**
 * Produce a `URLSearchParams` from the `element` and its `children()`.
 *
 * You may set the `disabled` attribute on a parent element to disable an entire subtree.
 *
 * Other than that, `serialize()` follows as best as possible the behavior of the `URLSearchParams` produced by a browser form submission.
 */
export function serialize(element) {
  const urlSearchParams = new URLSearchParams();
  const elements = children(element);
  for (const element of elements) {
    if (
      !element.matches("input, textarea") ||
      element.closest("[disabled]") !== null ||
      typeof element.getAttribute("name") !== "string"
    )
      continue;
    if (
      !(element.type === "radio" || element.type === "checkbox") ||
      ((element.type === "radio" || element.type === "checkbox") &&
        element.checked)
    )
      urlSearchParams.append(element.getAttribute("name"), element.value);
  }
  return urlSearchParams;
}

/**
 * Reset form fields from `element` and its `children()` using their `defaultValue` and `defaultChecked` properties, including calling `element.onchange()` when necessary.
 */
export function reset(element) {
  const elements = children(element);
  for (const element of elements) {
    if (!element.matches("input, textarea")) continue;
    if (element.value !== element.defaultValue) {
      element.value = element.defaultValue;
      element.onchange?.();
    }
    if (element.checked !== element.defaultChecked) {
      element.checked = element.defaultChecked;
      element.onchange?.();
    }
  }
}

/**
 * Detects whether there are form fields in `element` and its `children()` that are modified with respect to their `defaultValue` and `defaultChecked` properties.
 *
 * You may set `element.isModified = <true/false>` to force the result of `isModified()` for `element` and its `children()`.
 *
 * You may set the `disabled` attribute on a parent element to disable an entire subtree.
 *
 * `isModified()` powers the “your changes may be lost, do you wish to leave this page?” dialog that `@radically-straightforward/javascript` enables by default.
 */
export function isModified(element) {
  const elements = children(element);
  for (const element of elements)
    if (
      parents(element).some((element) => element.isModified === true) ||
      (element.matches("input, textarea") &&
        element.closest("[disabled]") === null &&
        !parents(element).some((element) => element.isModified === false) &&
        (element.value !== element.defaultValue ||
          element.checked !== element.defaultChecked))
    )
      return true;
  return false;
}
window.addEventListener("DOMContentLoaded", () => {
  window.onbeforeunload = (event) => {
    if (isModified(document.querySelector("body"))) event.preventDefault();
  };
});
document.addEventListener("submit", () => {
  window.onbeforeunload = () => {};
});
// TODO
//   window.onbeforelivenavigate = () =>
//     !isModified(document.querySelector("body")) ||
//     isSubmittingForm [THIS VARIABLE HAS BEEN REMOVED] ||
//     confirm(
//       "Your changes will be lost if you leave this page. Do you wish to continue?",
//     );

/**
 * Given an `element` with the `datetime` attribute, `relativizeDateTimeElement()` keeps it updated with a relative datetime. See `relativizeDateTime()`, which provides the relative datetime, and `backgroundJob()`, which provides the background job management.
 *
 * **Example**
 *
 * ```javascript
 * html`
 *   <time
 *     datetime="2024-04-03T14:51:45.604Z"
 *     javascript="${javascript`
 *       javascript.relativizeDateTimeElement(this);
 *     `}"
 *   ></time>
 * `;
 * ```
 */
export function relativizeDateTimeElement(
  element,
  { target = element, capitalize = false, ...relativizeDateTimeOptions } = {},
) {
  const dateString = element.getAttribute("datetime");
  setTippy({
    element: target,
    elementProperty: "relativizeDateTimeElementTooltip",
    tippyProps: {
      touch: false,
      content: `${localizeDateTime(dateString)} (${formatUTCDateTime(
        dateString,
      )})`,
    },
  });
  backgroundJob(
    element,
    "relativizeDateTimeBackgroundJob",
    { interval: 10 * 1000 },
    () => {
      element.textContent = relativizeDateTime(
        dateString,
        relativizeDateTimeOptions,
      );
      if (capitalize)
        element.textContent = utilities.capitalize(element.textContent);
    },
  );
}

/**
 * Returns a relative datetime, for example, `just now`, `3 minutes ago`, `in 3 minutes`, `3 hours ago`, `in 3 hours`, `yesterday`, `tomorrow`, `3 days ago`, `in 3 days`, `on 2024-04-03`, and so forth.
 *
 * - **`preposition`:** Whether to return `2024-04-03` or `on 2024-04-03`.
 */
export function relativizeDateTime(dateString, { preposition = false } = {}) {
  const minutes = Math.trunc(
    (new Date(dateString.trim()).getTime() - Date.now()) / (60 * 1000),
  );
  const hours = Math.trunc(
    (new Date(dateString.trim()).getTime() - Date.now()) / (60 * 60 * 1000),
  );
  const days =
    (new Date(localizeDate(dateString)) -
      new Date(localizeDate(new Date().toISOString()))) /
    (24 * 60 * 60 * 1000);
  const relativeTimeFormat = new Intl.RelativeTimeFormat("en-US", {
    numeric: "auto",
  });
  return Math.abs(minutes) < 1
    ? "just now"
    : Math.abs(hours) < 1
      ? relativeTimeFormat.format(minutes, "minutes")
      : Math.abs(days) < 1
        ? relativeTimeFormat.format(hours, "hours")
        : Math.abs(days) < 7
          ? relativeTimeFormat.format(days, "days")
          : `${preposition ? "on " : ""}${localizeDate(dateString)}`;
}

/**
 * Returns a localized datetime, for example, `2024-04-03 15:20`.
 */
export function localizeDateTime(dateString) {
  return `${localizeDate(dateString)} ${localizeTime(dateString)}`;
}

/**
 * Returns a localized date, for example, `2024-04-03`.
 */
export function localizeDate(dateString) {
  const date = new Date(dateString.trim());
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Returns a localized time, for example, `15:20`.
 */
export function localizeTime(dateString) {
  const date = new Date(dateString.trim());
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * Format a datetime into a representation that is user friendly.
 */
export function formatUTCDateTime(dateString) {
  const date = new Date(dateString.trim());
  return `${String(date.getUTCFullYear())}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(
    date.getUTCHours(),
  ).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/**
 * Convert a string into a DOM element. The string may have multiple siblings without a common parent, so `stringToElement()` returns a `<div>` containing the elements.
 */
export function stringToElement(string) {
  const element = document.createElement("div");
  element.innerHTML = string;
  return element;
}

/**
 * This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `backgroundJob()` with the following additions:
 *
 * 1. If called multiple times, this version of `backgroundJob()` `stop()`s the previous background job so that at most one background job is active at any given time.
 *
 * 2. When the `element` is detached from the document, the background job is `stop()`ped. See `isAttached()`.
 *
 * The background job object which offers the `run()` and `stop()` methods is available at `element[name]`.
 *
 * See, for example, `relativizeDateTimeElement()`, which uses `backgroundJob()` to periodically update a relative datetime, for example, “2 hours ago”.
 */
export function backgroundJob(
  element,
  elementProperty,
  utilitiesBackgroundJobOptions,
  job,
) {
  element[elementProperty]?.stop();
  element[elementProperty] = utilities.backgroundJob(
    utilitiesBackgroundJobOptions,
    async () => {
      if (!isAttached(element)) {
        element[elementProperty].stop();
        return;
      }
      await job();
    },
  );
}

/**
 * Check whether the `element` is attached to the document. This is different from the [`isConnected` property](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected) in the following ways:
 *
 * 1. It uses `parents()`, so it supports Tippy.js’s tippys that aren’t mounted but whose `target`s are attached.
 *
 * 2. You may force an element to be attached by setting `element.isAttached = true` on the `element` itself or on one of its parents.
 *
 * See, for example, `backgroundJob()`, which uses `isAttached()`.
 */
export function isAttached(element) {
  return parents(element).some(
    (parent) => parent.isAttached === true || parent.matches("html"),
  );
}

/**
 * Returns an array of parents, including `element` itself. It knows how to navigate up Tippy.js’s tippys that aren’t mounted.
 */
export function parents(element) {
  const parents = [];
  while (element !== null) {
    if (element.nodeType === element.ELEMENT_NODE) parents.push(element);
    element = element.matches?.("[data-tippy-root]")
      ? element._tippy.reference
      : element.parentElement;
  }
  return parents;
}

/**
 * Returns an array of children, including `element` itself.
 */
export function children(element) {
  return element === null ? [] : [element, ...element.querySelectorAll("*")];
}

/**
 * Returns an array of sibling elements, including `element` itself.
 */
export function nextSiblings(element) {
  const siblings = [];
  while (element !== null) {
    siblings.push(element);
    element = element.nextElementSibling;
  }
  return siblings;
}

/**
 * Returns an array of sibling elements, including `element` itself.
 */
export function previousSiblings(element) {
  const siblings = [];
  while (element !== null) {
    siblings.push(element);
    element = element.previousElementSibling;
  }
  return siblings;
}

/**
 * Source: <https://github.com/ccampbell/mousetrap/blob/2f9a476ba6158ba69763e4fcf914966cc72ef433/mousetrap.js#L135>
 */
export const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * Source: <https://github.com/DamonOehlman/detect-browser/blob/546e6f1348375d8a486f21da07b20717267f6c49/src/index.ts#L166>
 */
export const isSafari = /Version\/([0-9\._]+).*Safari/.test(
  navigator.userAgent,
);

/**
 * Whether the user has a physical keyboard or a virtual keyboard on a phone screen. This isn’t 100% reliable, because it works by detecting presses of modifiers keys (for example, `control`), but it works well enough.
 */
export let isPhysicalKeyboard = false;

/**
 * Whether the shift key is being held. Useful for events such as `paste`, which don’t include the state of modifier keys.
 */
export let shiftKey = false;

{
  const eventListener = (event) => {
    isPhysicalKeyboard =
      isPhysicalKeyboard ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey;
    shiftKey = event.shiftKey;
  };
  window.addEventListener("keydown", eventListener);
  window.addEventListener("keyup", eventListener);
}
