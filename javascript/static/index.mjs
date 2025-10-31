import html from "@radically-straightforward/html";
import * as utilities from "@radically-straightforward/utilities";
import fastMyersDiff from "fast-myers-diff";
import * as floatingUI from "@floating-ui/dom";

let documentState = "initial";

document.addEventListener("DOMContentLoaded", () => {
  if (documentState === "initial")
    liveNavigate.cache.set(
      window.location.href,
      new XMLSerializer().serializeToString(document),
    );
  execute(document.querySelector("html"));
  if (documentState === "initial" || documentState === "liveNavigating")
    documentState = "loaded";
});

document.addEventListener("click", async (event) => {
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.target.closest(`a:not([target="_blank"])`) !== null) {
    const element = event.target.closest(`a:not([target="_blank"])`);
    if (
      typeof element.getAttribute("href") !== "string" ||
      !element.getAttribute("href").match(/^[/#]/)
    )
      return;
    event.preventDefault();
    if (
      documentState === "liveNavigating" ||
      (element.getAttribute("href").startsWith("/") &&
        isModified(document.querySelector("html"), {
          includeSubforms: true,
        }) &&
        !confirm("Your changes will be lost if you continue."))
    )
      return;
    liveNavigate(new Request(element.href));
  } else if (
    event.target.closest(`[type~="form"]`) !== null &&
    event.target.closest(`button[type="submit"]`) !== null
  ) {
    const form = event.target.closest(`[type~="form"]`);
    const button = event.target.closest(`button[type="submit"]`);
    const method = (
      button.getAttribute("formmethod") ??
      form.getAttribute("method") ??
      "GET"
    ).toUpperCase();
    const action =
      button.getAttribute("formaction") ?? form.getAttribute("action") ?? "/";
    if (
      !action.startsWith("/") ||
      documentState === "liveNavigating" ||
      !validate(form)
    )
      return;
    const enctype =
      button.getAttribute("formenctype") ??
      form.getAttribute("enctype") ??
      "application/x-www-form-urlencoded";
    const body =
      enctype === "multipart/form-data"
        ? serialize(form)
        : new URLSearchParams(serialize(form));
    if (typeof button.getAttribute("name") === "string")
      body.append(button.getAttribute("name"), button.value);
    await form.onsubmit?.();
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
  }
});

window.addEventListener("popstate", () => {
  if (documentState === "liveNavigating") liveNavigate.abortController.abort();
  liveNavigate(new Request(window.location), { stateAlreadyPushed: true });
});

window.addEventListener("beforeunload", (event) => {
  if (
    documentState !== "navigatingAway" &&
    isModified(document.querySelector("html"), { includeSubforms: true })
  )
    event.preventDefault();
});

async function liveNavigate(request, { stateAlreadyPushed = false } = {}) {
  const requestURL = new URL(request.url);
  if (
    request.method === "GET" &&
    liveNavigate.previousLocation.pathname === requestURL.pathname &&
    liveNavigate.previousLocation.search === requestURL.search
  ) {
    if (!stateAlreadyPushed)
      window.history.pushState(null, "", requestURL.href);
    liveNavigate.previousLocation = { ...window.location };
    if (requestURL.hash.trim() !== "")
      document.getElementById(requestURL.hash.slice(1))?.scrollIntoView();
    return;
  }
  if (documentState === "liveConnection")
    liveConnection.abortController.abort();
  documentState = "liveNavigating";
  const cachedResponseText =
    request.method === "GET" ? liveNavigate.cache.get(request.url) : undefined;
  if (typeof cachedResponseText === "string")
    documentMount(cachedResponseText, { dispatchDOMContentLoaded: false });
  const progressBar = document
    .querySelector("body")
    .insertAdjacentElement(
      "afterbegin",
      stringToElement(html`<div key="progress-bar"></div>`),
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
  request.headers.set("Live-Navigation", "true");
  liveNavigate.abortController = new AbortController();
  let response;
  try {
    response = await fetch(request, {
      signal: liveNavigate.abortController.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") return;
    documentState = "navigatingAway";
    if (!stateAlreadyPushed && request.method === "GET")
      window.history.pushState(null, "", requestURL.href);
    liveNavigate.previousLocation = { ...window.location };
    document.querySelector('[key~="global-error"]')?.remove();
    document
      .querySelector("body")
      .insertAdjacentHTML(
        "afterbegin",
        html`
          <div key="global-error">
            Something went wrong. Please try reloading the page.
          </div>
        `,
      );
    throw error;
  } finally {
    progressBar.remove();
  }
  if (typeof response.headers.get("Location") === "string") {
    documentState = "navigatingAway";
    window.location.href = response.headers.get("Location");
    return;
  }
  const responseText = await response.text();
  if (request.method === "GET")
    liveNavigate.cache.set(response.url, responseText);
  const responseURL = new URL(response.url);
  responseURL.hash = requestURL.hash;
  if (
    !stateAlreadyPushed &&
    (liveNavigate.previousLocation.pathname !== responseURL.pathname ||
      liveNavigate.previousLocation.search !== responseURL.search)
  )
    window.history.pushState(null, "", responseURL.href);
  liveNavigate.previousLocation = { ...window.location };
  documentMount(responseText);
  if (responseURL.hash.trim() !== "")
    document.getElementById(responseURL.hash.slice(1))?.scrollIntoView();
  document.querySelector("[autofocus]")?.focus();
}
liveNavigate.cache = new utilities.Cache();
liveNavigate.abortController = undefined;
liveNavigate.previousLocation = { ...window.location };

/**
 * Open a [Live Connection](https://github.com/radically-straightforward/radically-straightforward/tree/main/server#live-connection) to the server.
 *
 * If a connection can’t be established, then an error message is shown in an element with `key="global-error"` which you may style.
 *
 * If the `content` of the meta tag `<meta name="version" content="___" />` has changed, a Live Connection update doesn’t happen. Instead, an error message is shown in an element with `key="global-error"` which you may style.
 *
 * This function is only meant to be called if:
 *
 * 1. The request in question is not a Live Connection itself.
 * 2. The request method is `GET`.
 * 3. The response status code is 200.
 *
 * The `reloadOnReconnect` parameter changes the behavior of Live Connections upon the occasional disconnection. When `reloadOnReconnect` is `false` (the default), the client shows an error message to the user and keeps trying to reconnect, which is useful, for example, in case the server malfunctions. When `reloadOnReconnect` is `true`, then as soon as the connection is reestablished, the browser reloads the page, which is useful during development.
 *
 * **Example**
 *
 * ```typescript
 * html`
 *   <!DOCTYPE html>
 *   <html
 *     javascript="${javascript`
 *       if (${
 *         request.liveConnection === undefined &&
 *         request.method === "GET" &&
 *         response.statusCode === 200
 *       })
 *         javascript.liveConnection(
 *           ${request.id}, {
 *             reloadOnReconnect: ${
 *               application.configuration.environment === "development"
 *             }
 *           }
 *         );
 *     `}"
 *   >
 *     <head>
 *       <meta name="version" content="${application.version}" />
 *     </head>
 *   </html>
 * `;
 * ```
 */
export async function liveConnection(
  requestId,
  { reloadOnReconnect = false } = {},
) {
  documentState = "liveConnection";
  let reloadOnConnect = false;
  const backgroundJob = utilities.backgroundJob(
    { interval: reloadOnReconnect ? 1000 : 5 * 1000 },
    async () => {
      liveConnection.abortController = new AbortController();
      let abortControllerTimeout = window.setTimeout(() => {
        liveConnection.abortController.abort();
      }, 60 * 1000);
      let response;
      try {
        response = await fetch(window.location.href, {
          headers: { "Live-Connection": requestId },
          signal: abortController.signal,
        });
        if (response.status !== 200) throw response;
      } catch (error) {
        window.clearTimeout(abortControllerTimeout);
        if (error.name === "AbortError") {
          backgroundJob.stop();
          return;
        }
        throw error;
      }
      try {
        liveConnection.failedToConnectGlobalError?.remove();
        delete liveConnection.failedToConnectGlobalError;
        if (reloadOnConnect) {
          liveConnection.backgroundJob.stop();
          documentState = "navigatingAway";
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
          liveNavigate.cache.set(response.url, responseText);
          documentMount(responseText);
        }
      } catch (error) {
        if (connected) return;
        document.querySelector('[key~="global-error"]')?.remove();
        liveConnection.failedToConnectGlobalError = document
          .querySelector("body")
          .insertAdjacentElement(
            "afterbegin",
            stringToElement(html`
              <div key="global-error">
                ${reloadOnReconnect
                  ? "Reloading…"
                  : "Failed to connect. Please check your internet connection and try reloading the page."}
              </div>
            `),
          );
        throw error;
      } finally {
        abortController.abort();
        window.clearTimeout(abortControllerTimeout);
        reloadOnConnect = reloadOnReconnect;
      }
    },
  );
}
liveConnection.abortController = undefined;

/**
 * > **Note:** This is a low-level function used by Live Navigation and Live Connection updates.
 *
 * Similar to `mount()`, but suited for morphing the entire `document`, for example, `documentMount()` dispatches the `DOMContentLoaded` event.
 *
 * If the `document` and the `content` have `<meta name="version" content="___" />` with different `content`s, then `documentMount()` displays an error message in an element with `key="global-error"` which you may style.
 */
export function documentMount(
  content,
  { dispatchDOMContentLoaded = true } = {},
) {
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
    documentState = "navigatingAway";
    document.querySelector('[key~="global-error"]')?.remove();
    document
      .querySelector("body")
      .insertAdjacentHTML(
        "afterbegin",
        html`
          <div key="global-error">
            There has been an update. Please reload the page.
          </div>
        `,
      );
    return;
  }
  morph(document.querySelector("html"), content);
  if (dispatchDOMContentLoaded)
    document.dispatchEvent(new Event("DOMContentLoaded"));
}

/**
 * `morph()` the `element` container to include `content`. `execute()` the browser JavaScript in the `element`. Protect the `element` from changing in Live Connection updates.
 */
export function mount(element, content) {
  if (typeof content === "string") content = stringToElements(content);
  delete element.morph;
  morph(element, content);
  execute(element);
  element.morph = false;
}

/**
 * > **Note:** This is a low-level function—in most cases you want to call `mount()` instead.
 *
 * Morph the contents of the `from` element into the contents of the `to` element with minimal DOM manipulation by using a diffing algorithm.
 *
 * Elements may provide a `key="___"` attribute to help identify them with respect to the diffing algorithm. This is similar to [React’s `key`s](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key), but sibling elements may have the same `key` (at the risk of potentially getting them mixed up if they’re reordered).
 *
 * Elements may define a `state="___"` attribute, typically through the `state___()` functions below, which is not morphed and is meant to include browser state, for example, whether a sidebar is open.
 *
 * In general, the following attributes aren’t morphed: `state`, `style`, `hidden`, `open`, and `disabled`.
 *
 * Elements may set a `morph` attribute, which when `false` prevents the element from being morphed. This is useful, for example, for elements that have been `mount()`ed and shouldn’t be removed.
 *
 * > **Note:** `to` is expected to already belong to the `document`. You may need to call [`importNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode) or [`adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) on a node before passing it to `morph()`. `documentStringToElement()` does that for you.
 *
 * > **Note:** `to` is mutated destructively in the process of morphing. Create a clone of `to` before passing it into `morph()` if you wish to continue using it.
 *
 * > **Note:** Elements may define an `onremove()` function, which is called before the element is removed during morphing. This is useful, for example, to prevent leaks of attached `IntersectionObserver`s and `MutationObserver`s by calling [`IntersectionObserver.disconnect()`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/disconnect) and [`MutationObserver.disconnect()`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect).
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
 * `morph()` is different from [React](https://react.dev/) in that it works with the DOM, not a Virtual DOM.
 */
export function morph(from, to) {
  if (from.morph === false) return;
  if (
    from.matches("input, textarea") &&
    !isModified(from, { ignoreIsModifiedProperty: true })
  )
    for (const property of ["value", "checked"])
      if (from[property] !== to[property]) from[property] = to[property];
  for (const attributeName of new Set([
    ...from.getAttributeNames(),
    ...to.getAttributeNames(),
  ])) {
    if (
      attributeName === "state" ||
      attributeName === "style" ||
      attributeName === "hidden" ||
      attributeName === "open" ||
      attributeName === "disabled"
    )
      continue;
    if (to.getAttribute(attributeName) === null)
      from.removeAttribute(attributeName);
    else if (
      from.getAttribute(attributeName) !== to.getAttribute(attributeName)
    )
      from.setAttribute(attributeName, to.getAttribute(attributeName));
  }
  const key = (node) =>
    `${node.nodeType}--${
      node.nodeType === Node.ELEMENT_NODE
        ? `${node.tagName}--${node.getAttribute("key")}--${node.getAttribute("name")}`
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
      if (node.morph !== false)
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
      if (
        from.childNodes[previousFromEnd + nodeIndexOffset].nodeType ===
        Node.ELEMENT_NODE
      )
        toMorph.add({
          from: from.childNodes[previousFromEnd + nodeIndexOffset],
          to: to.childNodes[previousToEnd + nodeIndexOffset],
        });
    for (let nodeIndex = toStart; nodeIndex < toEnd; nodeIndex++) {
      const fromChildNode = toRemove.get(toChildNodesKeys[nodeIndex])?.shift();
      const toChildNode = to.childNodes[nodeIndex];
      if (fromChildNode?.nodeType === Node.ELEMENT_NODE)
        toMorph.add({ from: fromChildNode, to: toChildNode });
      toAdd.push({
        node: fromChildNode ?? toChildNode,
        nodeAfter: from.childNodes[fromEnd] ?? null,
      });
    }
  }
  for (const nodes of toRemove.values())
    for (const node of nodes) {
      from.removeChild(node);
      if (node.nodeType === Node.ELEMENT_NODE)
        for (const element of children(node).reverse()) element.onremove?.();
    }
  for (const { node, nodeAfter } of toAdd) from.insertBefore(node, nodeAfter);
  for (const { from, to } of toMorph) morph(from, to);
}

/**
 * > **Note:** This is a low-level function—in most cases you want to call `mount()` instead.
 *
 * Execute the functions defined by the `javascript="___"` attribute, which is set by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) when extracting browser JavaScript. You must call this when you insert new elements in the DOM, for example:
 *
 * ```javascript
 * javascript.execute(
 *   document
 *     .querySelector("body")
 *     .insertAdjacentElement(
 *       "afterbegin",
 *       javascript.stringToElement(html`<div javascript="___"></div>`),
 *     ),
 * );
 * ```
 */
export function execute(element) {
  const elements = [
    ...(element.matches("[javascript]") ? [element] : []),
    ...element.querySelectorAll("[javascript]"),
  ];
  for (const element of elements) {
    const javascript = JSON.parse(element.getAttribute("javascript"));
    execute.functions
      .get(javascript.function)
      .call(element, ...javascript.arguments);
  }
  return element;
}
execute.functions = new Map();

/**
 * Similar to `stringToElement()` but for a `string` which is a whole document, for example, starting with `<!DOCTYPE html>`. [`document.adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode) is used so that the resulting element belongs to the current `document`.
 */
export function documentStringToElement(string) {
  return document.adoptNode(
    new DOMParser().parseFromString(string, "text/html").querySelector("html"),
  );
}

/**
 * Convert a string into a DOM element. The string may have multiple siblings without a common parent, so `stringToElements()` returns a `<div>` containing the elements. If `svg` is `true`, then the element is created in the SVG namespace, which is necessary for SVG elements to be drawn by the browser, and the container is an `<svg>` tag instead of a `<div>`.
 */
export function stringToElements(string, { svg = false } = {}) {
  const element = svg
    ? document.createElementNS("http://www.w3.org/2000/svg", "svg")
    : document.createElement("div");
  element.innerHTML = string;
  return element;
}

/**
 * A specialized version of `stringToElements()` for when the `string` is a single element and the wrapper `<div>` is unnecessary.
 */
export function stringToElement(string, options = {}) {
  return stringToElements(string, options).firstElementChild;
}

/**
 * Detects whether there are form fields in `element` and its `children()` that are modified with respect to their `defaultValue` and `defaultChecked` properties.
 *
 * You may set `element.isModified = <true/false>` to force the result of `isModified()` for `element` and its `children()`.
 *
 * You may set the `disabled` attribute on a parent element to disable an entire subtree.
 *
 * `isModified()` powers the “Your changes will be lost if you continue.” dialog that `@radically-straightforward/javascript` enables by default and the part of `morph()` that updates `<input>`s and `<textarea>`s. You may use `isModified()` in features such as only showing an “Update” button in case there is a form input that has been modified.
 */
export function isModified(
  element,
  { includeSubforms = false, ignoreIsModifiedProperty = false } = {},
) {
  const elements = children(element, { includeSubforms });
  for (const element of elements) {
    let isModifiedProperty;
    if (!ignoreIsModifiedProperty)
      for (const parent of parents(element))
        if (parent.isModified === true || parent.isModified === false) {
          isModifiedProperty = parent.isModified;
          break;
        }
    if (
      isModifiedProperty === true ||
      (isModifiedProperty !== false &&
        element.matches("input, textarea") &&
        element.closest("[disabled]") === null &&
        (((element.type === "checkbox" || element.type === "radio") &&
          element.checked !== element.defaultChecked) ||
          (!(element.type === "checkbox" || element.type === "radio") &&
            element.value !== element.defaultValue)))
    )
      return true;
  }
  return false;
}

/**
 * Reset form fields from `element` and its `children()` using their `defaultValue` and `defaultChecked` properties, including dispatching the `input` and `change` events.
 */
export function reset(element, { includeSubforms = false } = {}) {
  const elements = children(element, { includeSubforms });
  for (const element of elements) {
    if (!element.matches("input, textarea")) continue;
    let dispatchEvent = false;
    if (element.type === "checkbox" || element.type === "radio") {
      if (element.checked !== element.defaultChecked) {
        element.checked = element.defaultChecked;
        dispatchEvent = true;
      }
    } else {
      if (element.value !== element.defaultValue) {
        element.value = element.defaultValue;
        dispatchEvent = true;
      }
    }
    if (dispatchEvent) {
      element.dispatchEvent(
        new Event("input", {
          bubbles: true,
          cancelable: false,
          composed: true,
        }),
      );
      element.dispatchEvent(
        new Event("change", {
          bubbles: true,
          cancelable: false,
          composed: false,
        }),
      );
    }
  }
}

/**
 * Validate `element` (usually a `<div type="form">`) and its `children()`.
 *
 * Validation errors are reported with `popover()`s with the `.popover--error` class, which you may style.
 *
 * You may set the `disabled` attribute on a parent element to disable an entire subtree.
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
export function validate(element, { includeSubforms = false } = {}) {
  const elements = children(element, { includeSubforms });
  for (const element of elements) {
    if (
      !element.matches("input, textarea") ||
      element.closest("[disabled]") !== null
    )
      continue;
    try {
      if (element.matches("[required]")) {
        if (
          element.value.trim() === "" ||
          ((element.type === "radio" || element.type === "checkbox") &&
            !element.matches(":checked") &&
            !elements.some((otherElement) =>
              otherElement.matches(`[name="${element.name}"]:checked`),
            ))
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
        element.matches('[type="email"]') &&
        element.value.match(utilities.emailRegExp) === null
      )
        throw new ValidationError("Invalid email.");
      element.onvalidate?.();
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      let popoverTriggerElement = element;
      for (const parentElement of parents(element).reverse()) {
        if (parentElement.matches("[hidden]")) {
          popoverTriggerElement = parentElement.parentElement;
          break;
        }
        if (parentElement.matches('[type~="popover"]:not([state~="open"])')) {
          popoverTriggerElement = parentElement.popoverTriggerElement;
          break;
        }
      }
      popoverTriggerElement.focus();
      popover({
        element: popoverTriggerElement,
        target: html`
          <div type="popover" class="popover--error">${error.message}</div>
        `,
        trigger: "showOnce",
      });
      return false;
    }
  }
  return true;
}

/**
 * Custom error class for `validate()`.
 */
export class ValidationError extends Error {}

/**
 * Produce a [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) from the `element` and its `children()`.
 *
 * You may set the `disabled` attribute on a parent element to disable an entire subtree.
 *
 * Other than that, `serialize()` follows the behavior of `new FormData(form)`.
 */
export function serialize(element, { includeSubforms = false } = {}) {
  const formData = new FormData();
  const elements = children(element, { includeSubforms });
  for (const element of elements) {
    if (
      !element.matches("input, textarea") ||
      element.closest("[disabled]") !== null ||
      typeof element.getAttribute("name") !== "string"
    )
      continue;
    if (element.type === "file")
      for (const file of element.files)
        formData.append(element.getAttribute("name"), file);
    else if (
      !(element.type === "radio" || element.type === "checkbox") ||
      ((element.type === "radio" || element.type === "checkbox") &&
        element.checked)
    )
      formData.append(element.getAttribute("name"), element.value);
  }
  return formData;
}

/**
 * Keep an element updated with the relative datetime. See `relativizeDateTime()` (which provides the relative datetime) and `backgroundJob()` (which provides the background job management).
 *
 * **Example**
 *
 * ```typescript
 * const date = new Date(Date.now() - 10 * 60 * 60 * 1000);
 * html`
 *   <span
 *     javascript="${javascript`
 *       javascript.relativizeDateTimeElement(this, ${date.toISOString()});
 *       javascript.popover({ element: this });
 *     `}"
 *   ></span>
 *   <span
 *     type="popover"
 *     javascript="${javascript`
 *       this.textContent = javascript.localizeDateTime(${date.toISOString()});
 *     `}"
 *   ></span>
 * `;
 * ```
 */
export function relativizeDateTimeElement(
  element,
  dateString,
  { capitalize = false, ...relativizeDateTimeOptions } = {},
) {
  backgroundJob(
    element,
    "relativizeDateTimeElementBackgroundJob",
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
 * Format a datetime into a representation that is user friendly, for example, `2024-04-03 15:20 UTC`.
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
 * Add a `token` to the `state="___"` attribute
 *
 * The `state="___"` attribute is meant to be used to hold browser state, for example, whether a sidebar is open.
 *
 * The `state="___"` attribute is similar to the `class="___"` attribute, and the `state___()` functions are similar to the [`classList` property](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList). The main difference is that `morph()` preserves `state="___"` on Live Connection updates.
 *
 * The `state="___"` attribute is different from the `style="___"` attribute in that `state="___"` contains `token`s which may be addressed in CSS with the `[state~="___"]` selector and `style="___"` contains CSS directly.
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
 * See `stateAdd()`.
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
 * See `stateAdd()`.
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
 * Create a popover (tooltip, dropdown menu, and so forth).
 *
 * > **Note:** The `target.popoverTriggerElement` property is set to refer to `element`.
 *
 * **Parameters**
 *
 * - **`element`:** The element that is used as reference when positioning the popover and that triggers the popover open.
 *
 * - **`target`:** The element that contains the popover contents. It must have the `type="popover"` type, and it may have one of the `.popover--<color>` classes (see `@radically-straightforward/javascript/static/index.css`). As a special case, if `trigger` is set to `"showOnce"`, then `target` may be a string which is turned into a DOM element by `popover()`.
 *
 * - **`trigger`:** One of the following:
 *   - **`"hover"`:** Show the popover on the `element.onmouseenter` or `element.onfocusin` events and hide the popover on the `element.onmouseleave` or `element.onfocusout` events. The `target` must not contain elements that may be focused (for example, `<button>`, `<input>`, and so forth), otherwise keyboard navigation is broken. On `isTouch` devices, `"hover"` popovers don’t show up because they often conflict with `"click"` popovers.
 *
 *   - **`"click"`:** Show the popover on the `element.onclick` event. When to hide the popover depends on the `remainOpenWhileFocused`. If `remainOpenWhileFocused` is `false` (the default), then the next click anywhere will close the popover—this is useful for dropdown menus with `<button>`s. If `remainOpenWhileFocused` is `true`, then only clicks outside of the popover will close it—this is useful for dropdown menus with `<input>`s. If `remainOpenWhileFocused` is `true` and you need to close the popover programmatically, you may send a `click` event to an element out of the popover, for example, `document.querySelector("body").click()`.
 *
 *   - **`"showOnce"`:** Show the popover right away, and hide it (and remove it from the DOM) on the next `pointerdown` or `keydown` event.
 *
 *   - **`"none"`:** Showing and hiding the popover is the responsibility of the caller using the `target.showPopover()` and `target.hidePopover()` functions.
 *
 * - **`remainOpenWhileFocused`:** See discussion on `trigger: "click"`. This parameter is ignored if `trigger` is something else.
 *
 * - **`placement`:** One of [Floating UI’s `placement`s](https://floating-ui.com/docs/computePosition#placement).
 *
 * **Example**
 *
 * ```typescript
 * html`
 *   <button
 *     type="button"
 *     javascript="${javascript`
 *       javascript.popover({ element: this });
 *     `}"
 *   >
 *     Example of an element
 *   </button>
 *   <div type="popover">Example of a popover.</div>
 * `;
 * ```
 *
 * **Implementation notes**
 *
 * This is inspired by the [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) and [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning), but it doesn’t follow the browser implementation exactly. First, because not all browsers support these APIs yet and the polyfills don’t work well enough (for example, they don’t support `position-try`). Second, because the APIs can be a bit awkward to use, for example, asking for you to come up with `anchor-name`s, and using HTML attributes instead of CSS & JavaScript.
 *
 * We use [Floating UI](https://floating-ui.com/) for positioning and provide an API reminiscent of the discontinued [Tippy.js](https://atomiks.github.io/tippyjs/). The major difference is that in Tippy.js the `content` is kept out of the DOM while the popover is hidden, while we keep the `target` in the DOM (just hidden). This allows, for example, the popover to contain form fields which are submitted on form submission, and it makes inspecting and debugging easier. We also support fewer features and less customization, for example, there isn’t the concept of `interactive` separate of `trigger`, so you can’t create an interactive `"hover"` popover.
 */
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
}) {
  if (typeof target === "string") {
    target = execute(
      element.insertAdjacentElement("afterend", stringToElement(target)),
    );
    target.morph = false;
  }
  target.popoverTriggerElement = element;
  target.showPopover = async () => {
    const position = await floatingUI.computePosition(element, target, {
      placement,
      middleware: [floatingUI.flip(), floatingUI.shift({ padding: 8 })],
    });
    target.style.top = `${position.y}px`;
    target.style.left = `${position.x}px`;
    stateAdd(target, "open");
    const abortController = new AbortController();
    target.addEventListener(
      "transitionend",
      (event) => {
        if (
          event.target !== target ||
          event.propertyName !== "visibility" ||
          window.getComputedStyle(target).visibility === "hidden" ||
          !target.matches('[state~="open"]')
        )
          return;
        abortController.abort();
        onshow?.();
      },
      { signal: abortController.signal },
    );
  };
  target.hidePopover = () => {
    stateRemove(target, "open");
    const abortController = new AbortController();
    target.addEventListener(
      "transitionend",
      (event) => {
        if (
          event.target !== target ||
          event.propertyName !== "visibility" ||
          window.getComputedStyle(target).visibility !== "hidden" ||
          target.matches('[state~="open"]')
        )
          return;
        abortController.abort();
        target.style.top = "";
        target.style.left = "";
        onhide?.();
      },
      { signal: abortController.signal },
    );
  };
  if (trigger === "hover") {
    element.onmouseenter = element.onfocusin = () => {
      if (!isTouch) target.showPopover();
    };
    element.onmouseleave = element.onfocusout = () => {
      target.hidePopover();
    };
  } else if (trigger === "click")
    element.onclick = (elementEvent) => {
      if (target.matches('[state~="open"]')) return;
      target.showPopover();
      const abortController = new AbortController();
      document.addEventListener(
        "click",
        (event) => {
          if (
            elementEvent === event ||
            (remainOpenWhileFocused && target.contains(event.target))
          )
            return;
          abortController.abort();
          target.hidePopover();
        },
        { signal: abortController.signal },
      );
    };
  else if (trigger === "showOnce") {
    target.showPopover();
    const abortController = new AbortController();
    for (const eventType of ["pointerdown", "keydown"])
      document.addEventListener(
        eventType,
        () => {
          abortController.abort();
          target.hidePopover();
          {
            const abortController = new AbortController();
            target.addEventListener(
              "transitionend",
              (event) => {
                if (
                  event.target !== target ||
                  event.propertyName !== "visibility" ||
                  window.getComputedStyle(target).visibility !== "hidden" ||
                  target.matches('[state~="open"]')
                )
                  return;
                abortController.abort();
                target.remove();
              },
              { signal: abortController.signal },
            );
          }
        },
        { signal: abortController.signal },
      );
  } else if (trigger === "none") "NOOP";
  else throw new Error();
  return target;
}

/**
 * Returns an array of parents, including `element` itself.
 */
export function parents(element) {
  const parents = [];
  while (element !== null) {
    parents.push(element);
    element = element.parentElement;
  }
  return parents;
}

/**
 * Returns an array of children, including `element` itself.
 */
export function children(element, { includeSubforms = true } = {}) {
  const form = element.closest(`[type~="form"]`);
  const children = [element, ...element.querySelectorAll("*")];
  return includeSubforms
    ? children
    : children.filter((child) => child.closest(`[type~="form"]`) === form);
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
 * This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `backgroundJob()` with the following additions:
 *
 * 1. If called multiple times, this version of `backgroundJob()` `stop()`s the previous background job so that at most one background job is active at any given time.
 *
 * 2. When the `element`’s [`isConnected`](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected) is `false`, the background job is `stop()`ped.
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
      if (!element.isConnected) {
        element[elementProperty].stop();
        return;
      }
      await job();
    },
  );
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

for (const eventType of ["keydown", "keyup"])
  document.addEventListener(eventType, (event) => {
    isPhysicalKeyboard =
      isPhysicalKeyboard ||
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey;
    shiftKey = event.shiftKey;
  });

/**
 * Whether the device has a touch screen, as opposed to a mouse. This is useful, for example, to disable `popover()`s triggered by `"hover"`. See <https://github.com/atomiks/tippyjs/blob/ad85f6feb79cf6c5853c43bf1b2a50c4fa98e7a1/src/bindGlobalEventListeners.ts#L7-L18>.
 */
export let isTouch = false;
document.addEventListener(
  "touchstart",
  () => {
    isTouch = true;
  },
  { once: true },
);

for (const eventType of ["focusin", "focusout"])
  document.addEventListener(eventType, (event) => {
    for (const element of parents(event.target))
      element[`on${eventType}`]?.(event);
  });
