import * as utilities from "@radically-straightforward/utilities";
import fastMyersDiff from "fast-myers-diff";
import * as Tippy from "tippy.js";

async function liveNavigate(request, event) {
  if (event instanceof PopStateEvent) liveNavigate.abortController.abort();
  else if (liveNavigate.inProgress > 0) return;
  if (
    request.method === "GET" &&
    isModified(document.querySelector("body")) &&
    !confirm(
      "Your changes will be lost if you leave this page. Do you wish to continue?",
    )
  )
    return;
  window.onlivenavigate?.();
  try {
    liveNavigate.inProgress++;
    liveNavigate.abortController = new AbortController();
    if (request.method !== "GET")
      request.headers.set("CSRF-Protection", "true");
    const response = await fetch(request, {
      signal: liveNavigate.abortController.signal,
    });
    const requestURL = new URL(request.url);
    const responseURL = new URL(response.url);
    responseURL.hash = requestURL.hash;
    const responseText = await response.text();
    if (
      (request.method === "GET" ||
        liveNavigate.previousLocation.pathname !== responseURL.pathname ||
        liveNavigate.previousLocation.search !== responseURL.search) &&
      (!(event instanceof PopStateEvent) ||
        requestURL.pathname !== responseURL.pathname ||
        requestURL.search !== responseURL.search)
    )
      window.history.pushState(null, "", responseURL.href);
    Tippy.hideAll();
    const detail = { request, previousLocation: liveNavigate.previousLocation };
    morph(
      document.querySelector("html"),
      documentStringToElement(responseText),
      { detail },
    );
    document.querySelector("[autofocus]")?.focus();
    if (responseURL.hash.trim() !== "")
      document.getElementById(responseURL.hash.slice(1))?.scrollIntoView();
    window.dispatchEvent(new CustomEvent("DOMContentLoaded", { detail }));
  } catch (error) {
    if (error.name === "AbortError") return;
    if (request.method === "GET" && !(event instanceof PopStateEvent))
      window.history.pushState(null, "", request.url);
    tippy({
      event,
      element:
        document.querySelector("#global-error") ??
        document.querySelector("body > :first-child"),
      elementProperty: "liveNavigationErrorTooltip",
      trigger: "manual",
      hideOnClick: false,
      theme: "error",
      arrow: false,
      interactive: true,
      content: "Something went wrong. Please try reloading the page.",
    }).show();
    throw error;
  } finally {
    liveNavigate.inProgress--;
    liveNavigate.previousLocation = { ...window.location };
  }
}
liveNavigate.abortController = new AbortController();
liveNavigate.inProgress = 0;
liveNavigate.previousLocation = { ...window.location };
window.onclick = async (event) => {
  const link = event.target.closest(`a:not([target="_blank"])`);
  if (
    event.button !== 0 ||
    event.shiftKey ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    link === null ||
    link.origin !== window.location.origin ||
    link.liveNavigate === false
  )
    return;
  if (
    link.pathname === window.location.pathname &&
    link.search === window.location.search &&
    link.hash !== window.location.hash
  ) {
    liveNavigate.previousLocation = { ...window.location, hash: link.hash };
    return;
  }
  event.preventDefault();
  liveNavigate(new Request(link.href), event);
};
window.onsubmit = async (event) => {
  const method = (
    event.submitter?.getAttribute("formmethod") ?? event.target.method
  ).toUpperCase();
  const action =
    event.submitter?.getAttribute("formaction") ?? event.target.action;
  if (
    new URL(action).origin !== window.location.origin ||
    event.target.liveNavigate === false
  )
    return;
  const enctype =
    event.submitter?.getAttribute("formenctype") ?? event.target.enctype;
  const body =
    enctype === "multipart/form-data"
      ? new FormData(event.target)
      : new URLSearchParams(new FormData(event.target));
  if (typeof event.submitter?.getAttribute("name") === "string")
    body.set(event.submitter.getAttribute("name"), event.submitter.value);
  event.preventDefault();
  const request =
    method === "GET"
      ? (() => {
          const actionURL = new URL(action);
          for (const [name, value] of body)
            actionURL.searchParams.append(name, value);
          return new Request(actionURL.href);
        })()
      : new Request(action, { method, body });
  liveNavigate(request, event);
};
window.onpopstate = async (event) => {
  liveNavigate(new Request(window.location), event);
};

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
//     .querySelector(`meta[name="version"]`)
//     ?.getAttribute("content");
//   let inLiveNavigation = false; // TODO: Use liveNavigate.inProgress
//   let heartbeatTimeout;
//   let abortController;
//   let liveReloadOnNextConnection = false;

//   window.addEventListener(
//     // TODO: This event doesn’t exist anymore.
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
//         tippy({
//           element: body,
//           elementProperty: "liveConnectionValidationErrorTooltip",
//           appendTo: body,
//           trigger: "manual",
//           hideOnClick: false,
//           theme: "error",
//           arrow: false,
//           interactive: true,
//           content:
//             "Failed to connect to server. Please try reloading the page.",
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
//         tippy({
//           element: body,
//           elementProperty: "liveConnectionNewServerVersionTooltip",
//           appendTo: body,
//           trigger: "manual",
//           hideOnClick: false,
//           theme: "error",
//           arrow: false,
//           interactive: true,
//           content: newServerVersionMessage,
//         });
//         body.liveConnectionNewServerVersionTooltip.show();
//         return;
//       }

//       if (liveReloadOnNextConnection) {
//         body.isModified = false;
//         await new Promise((resolve) => {
//           window.setTimeout(resolve, 300);
//         });
//         window.location.reload();
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
//         const detail = {
//           previousLocation: { ...window.location },
//           liveConnectionUpdate: true,
//         };
//         morph(
//           document.querySelector("html"),
//           documentStringToElement(bufferPartJSON),
//           { detail },
//         );
//         window.dispatchEvent(new CustomEvent("DOMContentLoaded", { detail }));
//       }
//     } catch (error) {
//       if (inLiveNavigation) return;

//       console.error(error);

//       if (!connected) {
//         tippy({
//           element: body,
//           elementProperty: "liveConnectionOfflineTooltip",
//           appendTo: body,
//           trigger: "manual",
//           hideOnClick: false,
//           theme: "error",
//           arrow: false,
//           interactive: true,
//           content: liveReload ? "Live-Reloading…" : offlineMessage,
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

/**
 * `morph()` the `element` container to include `content`. `execute()` the browser JavaScript in the `element`. Protect the `element` from changing in Live Connection updates.
 */
export function mount(element, content, event = undefined) {
  element.isAttached = true;
  delete element.liveConnectionUpdate;
  morph(element, content, event);
  execute(element, event);
  delete element.isAttached;
  element.liveConnectionUpdate = false;
}

/**
 * **Note:** This is a low-level function—in most cases you want to call `mount()` instead.
 *
 * Morph the contents of the `from` container element into the contents of the `to` container element with minimal DOM manipulation by using a diffing algorithm.
 *
 * If the `to` element is a string, then it’s first converted into an element with `stringToElement()`.
 *
 * Elements may provide a `key="___"` attribute to help identify them with respect to the diffing algorithm. This is similar to [React’s `key`s](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key), but sibling elements may have the same `key` (at the risk of potentially getting them mixed up if they’re reordered).
 *
 * When `morph()` is called to perform a Live Connection update (that is,`event?.detail.liveConnectionUpdate`is `true`), elements may set a `liveConnectionUpdate` attribute, which controls the behavior of `morph()` in the following ways:
 *
 * - When `from.liveConnectionUpdate` is `false`, `morph()` doesn’t do anything. This is useful for elements which contain browser state that must be preserved on Live Connection updates, for example, the container of dynamically-loaded content (see `mount()`).
 *
 * - When `fromChildNode.liveConnectionUpdate` is `false`, `morph()` doesn’t remove that `fromChildNode` even if it’s missing among `to`’s child nodes. This is useful for elements that should remain on the page but wouldn’t be sent by server again in a Live Connection update, for example, an indicator of unread messages.
 *
 * - When `fromChildNode.liveConnectionUpdate` or any of `fromChildNode`’s parents is `new Set(["style", "hidden", "disabled", "value", "checked"])` or any subset thereof, the mentioned attributes are updated even in a Live Connection update (normally these attributes represent browser state and are skipped in Live Connection updates). This is useful, for example, for forms with hidden fields which must be updated by the server.
 *
 * > **Note:** `to` is expected to already belong to the `document`. You may need to call [`importNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode) or [`adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) on a node before passing it to `morph()`. `documentStringToElement()` does that for you.
 *
 * > **Note:** `to` is mutated destructively in the process of morphing. Create a clone of `to` before passing it into `morph()` if you wish to continue using it.
 *
 * **Related Work**
 *
 * `morph()` is different from `from.innerHTML = to.innerHTML` because setting `innerHTML` loses browser state, for example, form inputs, scrolling position, and so forth.
 *
 * `morph()` is different form [`morphdom`](https://github.com/patrick-steele-idem/morphdom) and its derivatives in the following ways:
 *
 * - `morph()` deals better with insertions/deletions/moves in the middle of a list. In some situations `morphdom` touches all subsequent elements, while `morph()` tends to only touch the affected elements.
 *
 * - `morph()` supports `key="___"` instead of `morphdom`’s `id="___"`s. `key`s don’t have to be unique across the document and don’t even have to be unique across the element siblings—they’re just a hint at the identity of the element that’s used in the diffing process.
 *
 * - `morph()` is aware of Live Connection updates, `tippy()`s, and so forth.
 */
export function morph(from, to, event) {
  if (
    event?.detail?.liveConnectionUpdate &&
    from.liveConnectionUpdate === false
  )
    return;
  if (typeof to === "string") to = stringToElement(to);
  const key = (node) =>
    `${node.nodeType}--${
      node.nodeType === node.ELEMENT_NODE
        ? `${node.tagName}--${node.getAttribute("key")}`
        : node.nodeValue
    }`;
  const fromChildNodesKeys = [...from.childNodes].map(key);
  const toChildNodesKeys = [...to.childNodes].map(key);
  const diff = [
    [0, 0, 0, 0],
    ...fastMyersDiff.diff(fromChildNodesKeys, toChildNodesKeys),
    [
      from.childNodes.length,
      from.childNodes.length,
      to.childNodes.length,
      to.childNodes.length,
    ],
  ];
  const toRemove = new Map();
  for (let diffIndex = 1; diffIndex < diff.length - 1; diffIndex++) {
    const [fromStart, fromEnd, toStart, toEnd] = diff[diffIndex];
    for (let nodeIndex = fromStart; nodeIndex < fromEnd; nodeIndex++) {
      const node = from.childNodes[nodeIndex];
      const key = fromChildNodesKeys[nodeIndex];
      if (
        event?.detail?.liveConnectionUpdate &&
        (node.liveConnectionUpdate === false ||
          node.matches?.("[data-tippy-root]"))
      )
        continue;
      toRemove.get(key)?.push(node) ?? toRemove.set(key, [node]);
    }
  }
  const toAdd = [];
  const toMorph = new Set();
  for (let diffIndex = 1; diffIndex < diff.length; diffIndex++) {
    const [previousFromStart, previousFromEnd, previousToStart, previousToEnd] =
      diff[diffIndex - 1];
    const [fromStart, fromEnd, toStart, toEnd] = diff[diffIndex];
    for (
      let nodeIndexOffset = 0;
      nodeIndexOffset < fromStart - previousFromEnd;
      nodeIndexOffset++
    )
      toMorph.add({
        from: from.childNodes[previousFromEnd + nodeIndexOffset],
        to: to.childNodes[previousToEnd + nodeIndexOffset],
      });
    for (let nodeIndex = toStart; nodeIndex < toEnd; nodeIndex++) {
      const fromChildNode = toRemove.get(toChildNodesKeys[nodeIndex])?.shift();
      const toChildNode = to.childNodes[nodeIndex];
      if (fromChildNode !== undefined)
        toMorph.add({ from: fromChildNode, to: toChildNode });
      toAdd.push({
        node: fromChildNode ?? toChildNode,
        nodeAfter: from.childNodes[fromEnd] ?? null,
      });
    }
  }
  for (const nodes of toRemove.values())
    for (const node of nodes) from.removeChild(node);
  for (const { node, nodeAfter } of toAdd) from.insertBefore(node, nodeAfter);
  for (const { from, to } of toMorph) {
    if (from.nodeType !== from.ELEMENT_NODE) continue;
    for (const attribute of new Set([
      ...from.getAttributeNames(),
      ...to.getAttributeNames(),
      ...(from.matches("input, textarea") ? ["value", "checked"] : []),
    ])) {
      if (
        event?.detail?.liveConnectionUpdate &&
        (attribute === "style" ||
          attribute === "hidden" ||
          attribute === "disabled" ||
          attribute === "value" ||
          attribute === "checked") &&
        !parents(from).some((element) =>
          element.liveConnectionUpdate?.has?.(attribute),
        )
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
 * **Note:** This is a low-level function—in most cases you want to call `mount()` instead.
 *
 * Execute the functions defined by the `javascript="___"` attribute, which is set by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) when extracting browser JavaScript. You must call this when you insert new elements in the DOM, for example, when mounting content.
 */
export function execute(element, event) {
  const elements = element.querySelectorAll("[javascript]");
  for (const element of elements) {
    if (
      event?.detail?.liveConnectionUpdate &&
      (element.closest("[data-tippy-root]") !== null ||
        parents(element)
          .slice(1)
          .some((element) => element.liveConnectionUpdate === false))
    )
      continue;
    const javascript = JSON.parse(element.getAttribute("javascript"));
    execute.functions
      .get(javascript.function)
      .call(element, event, ...javascript.arguments);
  }
}
execute.functions = new Map();
window.addEventListener("DOMContentLoaded", (event) => {
  execute(document, event);
});

/**
 * Create a [Tippy.js](https://atomiks.github.io/tippyjs/) tippy. This is different from calling Tippy’s constructor because if `tippy()` is called multiple times on the same `element` with the same `elementProperty`, then it doesn’t create new tippys but `mount()`s the `content`.
 */
export function tippy({
  event = undefined,
  element,
  elementProperty = "tooltip",
  content,
  ...tippyProps
}) {
  element[elementProperty] ??= Tippy.default(element, {
    content: document.createElement("div"),
  });
  element[elementProperty].setProps(tippyProps);
  mount(element[elementProperty].props.content, content, event);
  return element[elementProperty];
}
Tippy.default.setDefaultProps({
  arrow: Tippy.roundArrow + Tippy.roundArrow,
  duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 1
    : 150,
});

/**
 * Validate `element` (usually a `<form>`) and its `children()`.
 *
 * Validation errors are reported with `tippy()`s with the `error` theme.
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
      tippy({
        element: target,
        elementProperty: "validationErrorTooltip",
        theme: "error",
        trigger: "manual",
        content: error.message,
      }).show();
      target.focus();
      return false;
    }
  }
  return true;
}
window.addEventListener(
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
window.addEventListener("submit", () => {
  window.onbeforeunload = () => {};
});

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
  tippy({
    element: target,
    elementProperty: "relativizeDateTimeElementTooltip",
    touch: false,
    content: `${localizeDateTime(dateString)} (${formatUTCDateTime(
      dateString,
    )})`,
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
 * Similar to `stringToElement()` but for a `string` which is a whole document, for example, starting `<!DOCTYPE html>`. [`document.adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) is used so that the resulting element belongs to the current `document`.
 */
export function documentStringToElement(string) {
  return document.adoptNode(
    new DOMParser().parseFromString(string, "text/html").querySelector("html"),
  );
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
 * 1. It uses `parents()`, so it supports `tippy()`s that aren’t showing but whose `target`s are attached.
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
 * Returns an array of parents, including `element` itself. It knows how to navigate up `tippy()`s that aren’t showing.
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
