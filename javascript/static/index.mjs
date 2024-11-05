import * as utilities from "@radically-straightforward/utilities";
import fastMyersDiff from "fast-myers-diff";
import * as Tippy from "tippy.js";

async function liveNavigate(request, event = undefined) {
  if (event instanceof PopStateEvent) liveNavigate.abortController?.abort();
  else if (
    liveNavigate.abortController !== undefined ||
    (request.method === "GET" &&
      isModified(document.querySelector("body")) &&
      !confirm("Your changes will be lost if you continue."))
  )
    return;
  const progressBar = document
    .querySelector("body")
    .insertAdjacentElement(
      "beforeend",
      stringToElement(`<div key="progress-bar"></div>`).firstElementChild,
    );
  backgroundJob(progressBar, "progressBar", { interval: 1000 }, () => {
    progressBar.style.width =
      (progressBar.style.width.trim() === ""
        ? "15"
        : (() => {
            const width = Number(progressBar.style.width.slice(0, -1));
            return width + (90 - width) / (10 + Math.random() * 50);
          })()) + "%";
  });
  try {
    liveConnection.backgroundJob?.stop();
    liveNavigate.abortController = new AbortController();
    const response = await fetch(request, {
      signal: liveNavigate.abortController.signal,
    });
    const responseURL = new URL(response.url);
    responseURL.hash = new URL(request.url).hash;
    const responseText = await response.text();
    if (
      window.location.pathname !== responseURL.pathname ||
      window.location.search !== responseURL.search
    )
      window.history.pushState(null, "", responseURL.href);
    Tippy.hideAll();
    documentMount(responseText);
    if (responseURL.hash.trim() !== "")
      document.getElementById(responseURL.hash.slice(1))?.scrollIntoView();
    document.querySelector("[autofocus]")?.focus();
  } catch (error) {
    if (error.name === "AbortError") return;
    if (!(event instanceof PopStateEvent) && request.method === "GET")
      window.history.pushState(null, "", request.url);
    document.querySelector('[key="global-error"]')?.remove();
    document
      .querySelector("body")
      .insertAdjacentHTML(
        "beforeend",
        `<div key="global-error">Something went wrong. Please try reloading the page.</div>`,
      );
    throw error;
  } finally {
    progressBar.remove();
    delete liveNavigate.abortController;
  }
}
liveNavigate.abortController = undefined;
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
    (link.pathname === window.location.pathname &&
      link.search === window.location.search &&
      link.hash !== window.location.hash) ||
    link.liveNavigate === false
  )
    return;
  event.preventDefault();
  liveNavigate(new Request(link.href));
};
window.onsubmit = async (event) => {
  const method = (
    event.submitter?.getAttribute("formmethod") ??
    event.target.getAttribute("method") ??
    event.target.method
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
  if (
    typeof event.submitter?.getAttribute("name") === "string" &&
    event.submitter.getAttribute("name").trim() !== ""
  )
    body.append(event.submitter.getAttribute("name"), event.submitter.value);
  event.preventDefault();
  liveNavigate(
    method === "GET"
      ? (() => {
          const actionURL = new URL(action);
          for (const [name, value] of body)
            actionURL.searchParams.append(name, value);
          return new Request(actionURL.href);
        })()
      : new Request(action, {
          method,
          headers: { "CSRF-Protection": "true" },
          body,
        }),
  );
};
window.onpopstate = async (event) => {
  liveNavigate(new Request(window.location), event);
};

/**
 * Open a [Live Connection](https://github.com/radically-straightforward/radically-straightforward/tree/main/server#live-connection) to the server.
 *
 * If a connection can’t be established, then an error message is shown in an element with `key="global-error"` which you may style.
 *
 * If the `content` of the meta tag `<meta name="version" content="___" />` has changed, a Live Connection update doesn’t happen. Instead, an error message is shown in an element with `key="global-error"` which you may style.
 *
 * If `reload` is `true` then the page reloads when the connection is closed and reopened, because presumably the server has been restarted after a code modification during development.
 */
export async function liveConnection(requestId, { reload = false }) {
  let abortController;
  let abortControllerTimeout;
  let reloadOnConnect = false;
  liveConnection.backgroundJob ??= utilities.backgroundJob(
    {
      interval: reload ? 1000 : 5 * 1000,
      onStop: () => {
        abortController.abort();
        window.clearTimeout(abortControllerTimeout);
        delete liveConnection.backgroundJob;
      },
    },
    async () => {
      let connected = false;
      try {
        abortController = new AbortController();
        abortControllerTimeout = window.setTimeout(() => {
          abortController.abort();
        }, 60 * 1000);
        const response = await fetch(window.location.href, {
          headers: { "Live-Connection": requestId },
          signal: abortController.signal,
        });
        if (response.status !== 200) throw response;
        connected = true;
        liveConnection.failedToConnectGlobalError?.remove();
        delete liveConnection.failedToConnectGlobalError;
        if (reloadOnConnect) {
          document.querySelector("body").isModified = false;
          window.location.reload();
          return;
        }
        const responseBodyReader = response.body
          .pipeThrough(
            new TransformStream({
              async transform(chunk, controller) {
                window.clearTimeout(abortControllerTimeout);
                abortControllerTimeout = window.setTimeout(() => {
                  abortController.abort();
                }, 60 * 1000);
                controller.enqueue(await chunk);
              },
            }),
          )
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new utilities.JSONLinesTransformStream())
          .getReader();
        while (true) {
          const responseText = (await responseBodyReader.read()).value;
          if (responseText === undefined) break;
          documentMount(
            responseText,
            new CustomEvent("DOMContentLoaded", {
              detail: { liveConnectionUpdate: true },
            }),
          );
        }
      } catch (error) {
        if (connected) return;
        document.querySelector('[key="global-error"]')?.remove();
        liveConnection.failedToConnectGlobalError = document
          .querySelector("body")
          .insertAdjacentElement(
            "beforeend",
            stringToElement(
              `<div key="global-error">${
                reload
                  ? "Reloading…"
                  : "Failed to connect. Please check your internet connection and try reloading the page."
              }</div>`,
            ).firstElementChild,
          );
        throw error;
      } finally {
        abortController.abort();
        window.clearTimeout(abortControllerTimeout);
        reloadOnConnect = reload;
      }
    },
  );
}
liveConnection.backgroundJob = undefined;
liveConnection.failedToConnectGlobalError = undefined;

/**
 * `morph()` the `element` container to include `content`. `execute()` the browser JavaScript in the `element`. Protect the `element` from changing in Live Connection updates.
 */
export function mount(element, content, event = undefined) {
  if (typeof content === "string") content = stringToElement(content);
  element.isAttached = true;
  delete element.liveConnectionUpdate;
  morph(element, content, event);
  execute(element, event);
  delete element.isAttached;
  element.liveConnectionUpdate = false;
}

/**
 * > **Note:** This is a low-level function used by Live Navigation and Live Connection.
 *
 * Similar to `mount()`, but suited for morphing the entire `document`. For example, it dispatches the `event` to the `window`.
 *
 * If the `document` and the `content` have `<meta name="version" content="___" />` with different `content`s, then `documentMount()` displays an error message in an element with `key="global-error"` which you may style.
 */
export function documentMount(content, event = new Event("DOMContentLoaded")) {
  if (typeof content === "string") content = documentStringToElement(content);
  const documentVersion = document
    .querySelector('meta[name="version"]')
    ?.getAttribute("content");
  const contentVersion = content
    .querySelector('meta[name="version"]')
    ?.getAttribute("content");
  if (
    typeof documentVersion === "string" &&
    typeof contentVersion === "string" &&
    documentVersion !== contentVersion
  ) {
    document.querySelector("body").isModified = false;
    document.querySelector('[key="global-error"]')?.remove();
    document
      .querySelector("body")
      .insertAdjacentHTML(
        "beforeend",
        `<div key="global-error">There has been an update. Please reload the page.</div>`,
      );
    return;
  }
  morph(document.querySelector("html"), content, event);
  window.dispatchEvent(event);
}

/**
 * > **Note:** This is a low-level function—in most cases you want to call `mount()` instead.
 *
 * Morph the contents of the `from` element into the contents of the `to` element with minimal DOM manipulation by using a diffing algorithm.
 *
 * Elements may provide a `key="___"` attribute to help identify them with respect to the diffing algorithm. This is similar to [React’s `key`s](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key), but sibling elements may have the same `key` (at the risk of potentially getting them mixed up if they’re reordered).
 *
 * Elements may define a `state="___"` attribute, typically through the `state___()` methods below, which is not morphed on Live Connection updates, and is meant to include browser state, for example, whether a sidebar is open.
 *
 * When `morph()` is called to perform a Live Connection update (that is,`event?.detail.liveConnectionUpdate`is `true`), elements may set a `liveConnectionUpdate` attribute, which controls the behavior of `morph()` in the following ways:
 *
 * - When `from.liveConnectionUpdate` is `false`, `morph()` doesn’t do anything. This is useful for elements which contain browser state that must be preserved on Live Connection updates, for example, the container of dynamically-loaded content (see `mount()`).
 *
 * - When `from.liveConnectionUpdate` or any of `from`’s parents is `new Set(["state", "style", "hidden", "open", "disabled", "value", "checked"])` or any subset thereof, the mentioned attributes and properties are updated even in a Live Connection update (normally these attributes and properties represent browser state and are skipped in Live Connection updates). This is useful, for example, for forms with hidden fields which must be updated by the server.
 *
 * - When `fromChildNode.liveConnectionUpdate` is `false`, `morph()` doesn’t remove that `fromChildNode` even if it’s missing among `to`’s child nodes. This is useful for elements that should remain on the page but wouldn’t be sent by server again in a Live Connection update, for example, an indicator of unread messages.
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
export function morph(from, to, event = undefined) {
  if (
    event?.detail?.liveConnectionUpdate &&
    from.liveConnectionUpdate === false
  )
    return;
  for (const attribute of new Set([
    ...from.getAttributeNames(),
    ...to.getAttributeNames(),
  ])) {
    if (
      event?.detail?.liveConnectionUpdate &&
      (attribute === "state" ||
        attribute === "style" ||
        attribute === "hidden" ||
        attribute === "open" ||
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
  }
  if (from.matches("input, textarea"))
    for (const property of ["value", "checked"]) {
      if (
        event?.detail?.liveConnectionUpdate &&
        !parents(from).some((element) =>
          element.liveConnectionUpdate?.has?.(property),
        )
      )
        continue;
      if (from[property] !== to[property]) from[property] = to[property];
    }
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
  for (const { from, to } of toMorph)
    if (from.nodeType === from.ELEMENT_NODE) morph(from, to, event);
}

/**
 * TODO
 */
export function stateAdd(element, token) {
  const state = new Set(
    (element.getAttribute("state") ?? "")
      .split(" ")
      .filter((token) => token !== ""),
  );
  state.add(token);
  element.setAttribute("state", [...state].join(" "));
}

/**
 * TODO
 */
export function stateRemove(element, token) {
  const state = new Set(
    (element.getAttribute("state") ?? "")
      .split(" ")
      .filter((token) => token !== ""),
  );
  state.delete(token);
  element.setAttribute("state", [...state].join(" "));
}

/**
 * TODO
 */
export function stateToggle(element, token) {
  const state = new Set(
    (element.getAttribute("state") ?? "")
      .split(" ")
      .filter((token) => token !== ""),
  );
  if (state.has(token)) state.delete(token);
  else state.add(token);
  element.setAttribute("state", [...state].join(" "));
}

/**
 * > **Note:** This is a low-level function—in most cases you want to call `mount()` instead.
 *
 * Execute the functions defined by the `javascript="___"` attribute, which is set by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) when extracting browser JavaScript. You must call this when you insert new elements in the DOM, for example, when mounting content.
 */
export function execute(element, event = undefined) {
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
 * Create a [Tippy.js](https://atomiks.github.io/tippyjs/) tippy. This is different from calling Tippy’s constructor for the following reasons:
 *
 * 1. If `tippy()` is called multiple times on the same `element` with the same `elementProperty`, then it doesn’t create new tippys but `mount()`s the `content`.
 *
 * 2. The defaults are different:
 *
 *    - **`ignoreAttributes`:** Set to `true` because we active `tippy()` via JavaScript, not HTML `data` attributes.
 *
 *    - **`arrow`:** Set to `false`, because most user interface `tippy()`s don’t use an arrow.
 *
 *    - **`offset`:** Set to `[0, 0]`, because `arrow` has been set to `false` so it doesn’t make sense to distance the `tippy()` from the trigger.
 *
 *    - **`touch`:** Set is only set to `true` by default if:
 *
 *      - `interactive` is set to `true`, because most noninteractive `tippy()`s don’t work well on touch devices (see https://atomiks.github.io/tippyjs/v6/misc/#touch-devices), but most interactive `tippy()`s work well on touch devices (usually they’re menus).
 *
 *      - `trigger` is set to `"manual"`, because we understand it to mean that you want to control the showing of the `tippy()` programmatically.
 *
 *    - **`hideOnClick`:** Set to `false` if `trigger` is `"manual"`, because we understand it to mean that you want to control the showing of the `tippy()` programmatically.
 *
 *    - **`duration`:** Respect `prefers-reduced-motion: reduce` by default.
 */
export function tippy({
  event = undefined,
  element,
  elementProperty = "tippy",
  content,
  ...tippyProps
}) {
  element[elementProperty] ??= Tippy.default(element, {
    content: document.createElement("div"),
  });
  element[elementProperty].setProps({
    ignoreAttributes: true,
    arrow: false,
    offset: [0, 0],
    touch: tippyProps.interactive === true || tippyProps.trigger === "manual",
    hideOnClick: tippyProps.trigger !== "manual",
    duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 150,
    ...tippyProps,
  });
  mount(element[elementProperty].props.content, content, event);
  return element[elementProperty];
}

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
        trigger: "manual",
        hideOnClick: true,
        theme: "error",
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
    if (element.type === "checkbox" || element.type === "radio") {
      if (element.checked !== element.defaultChecked) {
        element.checked = element.defaultChecked;
        element.onchange?.();
      }
    } else {
      if (element.value !== element.defaultValue) {
        element.value = element.defaultValue;
        element.onchange?.();
      }
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
        (((element.type === "checkbox" || element.type === "radio") &&
          element.checked !== element.defaultChecked) ||
          (element.type !== "checkbox" &&
            element.type !== "radio" &&
            element.value !== element.defaultValue)))
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
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey;
    shiftKey = event.shiftKey;
  };
  window.addEventListener("keydown", eventListener);
  window.addEventListener("keyup", eventListener);
}
