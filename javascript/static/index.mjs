import * as utilities from "@radically-straightforward/utilities";
// import fastMyersDiff from "fast-myers-diff";
// import tippy, * as tippyStatic from "tippy.js";

// export function tippySetDefaultProps(extraProps = {}) {
//   tippy.setDefaultProps({
//     arrow: tippyStatic.roundArrow + tippyStatic.roundArrow,
//     duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
//       ? 1
//       : 150,
//     ...extraProps,
//   });
// }

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
//             liveUpdate: true,
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
//   if (!event?.detail?.liveUpdate) tippyStatic.hideAll();

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

//   if (!event?.detail?.liveUpdate)
//     document.querySelector("[autofocus]")?.focus();
// }

// export function loadPartial(parentElement, partialString) {
//   morph(parentElement, partialString);

//   parentElement.partialParentElement = true;
//   parentElement.forceIsConnected = true;
//   execute({ element: parentElement });
//   const parentElementTippy = parentElement.closest("[data-tippy-root]")?._tippy;
//   if (parentElementTippy !== undefined)
//     parentElementTippy.setContent(parentElementTippy.props.content);
//   parentElement.forceIsConnected = false;
// }

// export function morph(from, to, event = undefined) {
//   if (typeof to === "string") to = stringToElement(to);

//   if (
//     from.onbeforemorph?.(event) === false ||
//     (event?.detail?.liveUpdate && from.partialParentElement === true)
//   )
//     return;

//   const fromChildNodes = from.childNodes;
//   const toChildNodes = to.childNodes;

//   const getKey = (node) =>
//     `${node.nodeType}--${
//       node.nodeType === node.ELEMENT_NODE
//         ? `${node.tagName}--${node.getAttribute("key")}`
//         : node.nodeValue
//     }`;

//   const fromKeys = [...fromChildNodes].map(getKey);
//   const toKeys = [...toChildNodes].map(getKey);

//   const diff = [
//     [0, 0, 0, 0],
//     ...fastMyersDiff.diff(fromKeys, toKeys),
//     [
//       fromChildNodes.length,
//       fromChildNodes.length,
//       toChildNodes.length,
//       toChildNodes.length,
//     ],
//   ];

//   const toRemove = [];
//   const moveCandidates = new Map();
//   for (let diffIndex = 1; diffIndex < diff.length; diffIndex++) {
//     const [fromStart, fromEnd, toStart, toEnd] = diff[diffIndex];
//     for (let nodeIndex = fromStart; nodeIndex < fromEnd; nodeIndex++) {
//       const node = fromChildNodes[nodeIndex];
//       const key = fromKeys[nodeIndex];

//       if (
//         event?.detail?.liveUpdate &&
//         (node.onbeforeremove?.(event) === false ||
//           node.matches?.("[data-tippy-root]"))
//       )
//         continue;

//       toRemove.push(node);
//       moveCandidates.get(key)?.push(node) ?? moveCandidates.set(key, [node]);
//     }
//   }

//   const toAdd = [];
//   const toMorph = [];
//   for (let diffIndex = 1; diffIndex < diff.length; diffIndex++) {
//     const [previousFromStart, previousFromEnd, previousToStart, previousToEnd] =
//       diff[diffIndex - 1];
//     const [fromStart, fromEnd, toStart, toEnd] = diff[diffIndex];

//     for (
//       let nodeIndexOffset = 0;
//       nodeIndexOffset < fromStart - previousFromEnd;
//       nodeIndexOffset++
//     )
//       toMorph.push({
//         from: fromChildNodes[previousFromEnd + nodeIndexOffset],
//         to: toChildNodes[previousToEnd + nodeIndexOffset],
//       });

//     if (toStart === toEnd) continue;

//     const nodes = [];
//     for (let nodeIndex = toStart; nodeIndex < toEnd; nodeIndex++) {
//       const toChildNode = toChildNodes[nodeIndex];

//       let node = moveCandidates.get(toKeys[nodeIndex])?.shift();
//       if (node === undefined) node = document.importNode(toChildNode, true);
//       else toMorph.push({ from: node, to: toChildNode });

//       nodes.push(node);
//     }
//     toAdd.push({ nodes, nodeAfter: fromChildNodes[fromEnd] });
//   }

//   for (const node of toRemove) from.removeChild(node);

//   for (const { nodeAfter, nodes } of toAdd)
//     if (nodeAfter !== undefined)
//       for (const node of nodes) from.insertBefore(node, nodeAfter);
//     else for (const node of nodes) from.appendChild(node);

//   for (const { from, to } of toMorph) {
//     if (from.nodeType !== from.ELEMENT_NODE) continue;

//     const isInput = ["input", "textarea"].includes(from.tagName.toLowerCase());
//     const inputAttributes = ["value", "checked"];

//     for (const attribute of new Set([
//       ...from.getAttributeNames(),
//       ...to.getAttributeNames(),
//       ...(isInput ? inputAttributes : []),
//     ])) {
//       if (
//         event?.detail?.liveUpdate &&
//         ["style", "hidden", "disabled", ...inputAttributes].includes(
//           attribute,
//         ) &&
//         parents(from).every(
//           (element) =>
//             element.onbeforemorphattribute?.(event, attribute) !== true,
//         )
//       )
//         continue;

//       const fromAttribute = from.getAttribute(attribute);
//       const toAttribute = to.getAttribute(attribute);

//       if (toAttribute === null) from.removeAttribute(attribute);
//       else if (fromAttribute !== toAttribute)
//         from.setAttribute(attribute, toAttribute);

//       if (
//         inputAttributes.includes(attribute) &&
//         from[attribute] !== to[attribute]
//       )
//         from[attribute] = to[attribute];
//     }

//     morph(from, to, event);
//   }
// }

// export function setTippy({
//   event = undefined,
//   element,
//   elementProperty = "tooltip",
//   tippyProps: { content: tippyContent, ...tippyProps },
// }) {
//   element[elementProperty] ??= tippy(element, {
//     content: stringToElement(""),
//   });
//   element[elementProperty].setProps(tippyProps);

//   const tippyContentElement = element[elementProperty].props.content;
//   morph(tippyContentElement, tippyContent, event);
//   execute({
//     event,
//     element: tippyContentElement,
//   });

//   return element[elementProperty];
// }

// export function validate(element) {
//   const elementsToValidate = children(element);
//   const elementsToReset = new Map();

//   for (const element of elementsToValidate) {
//     if (
//       element.closest("[disabled]") !== null ||
//       parents(element).some((element) => element.isValid === true)
//     )
//       continue;
//     const valueInputByUser = element.value;
//     const error = validateElement(element);
//     if (element.value !== valueInputByUser)
//       elementsToReset.set(element, valueInputByUser);
//     if (typeof error !== "string") continue;
//     for (const [element, valueInputByUser] of elementsToReset)
//       element.value = valueInputByUser;
//     const target =
//       element.closest(
//         "[hidden], .visually-hidden, .visually-hidden--interactive:not(:focus):not(:focus-within):not(:active)",
//       )?.parentElement ?? element;
//     setTippy({
//       element: target,
//       elementProperty: "validationErrorTooltip",
//       tippyProps: {
//         theme: "error",
//         trigger: "manual",
//         content: error,
//       },
//     });
//     target.validationErrorTooltip.show();
//     target.focus();
//     return false;
//   }
//   return true;

//   function validateElement(element) {
//     if (element.closest("[required]"))
//       switch (element.type) {
//         case "radio":
//           if (
//             element
//               .closest("form")
//               .querySelector(`[name="${element.name}"]:checked`) === null
//           )
//             return "Please select one of these options.";
//           break;
//         case "checkbox":
//           const checkboxes = [
//             ...element
//               .closest("form")
//               .querySelectorAll(`[name="${element.name}"]`),
//           ];
//           if (!checkboxes.some((checkbox) => checkbox.checked))
//             return checkboxes.length === 1
//               ? "Please check this checkbox."
//               : "Please select at least one of these options.";
//           break;
//         default:
//           if (element.value.trim() === "") return "Please fill out this field.";
//           break;
//       }

//     if (
//       element.matches("[minlength]") &&
//       element.value.trim() !== "" &&
//       element.value.length < Number(element.getAttribute("minlength"))
//     )
//       return `This field must have at least ${element.getAttribute(
//         "minlength",
//       )} characters.`;

//     if (
//       element.matches(`[type="email"]`) &&
//       element.value.trim() !== "" &&
//       element.value.match(utilities.emailRegExp) === null
//     )
//       return "Please enter an email address.";

//     const error = element.onvalidate?.();
//     if (typeof error === "string") return error;
//   }
// }
// document.addEventListener(
//   "submit",
//   (event) => {
//     if (validate(event.target)) return;
//     event.preventDefault();
//     event.stopImmediatePropagation();
//   },
//   { capture: true },
// );
// export function validateLocalizedDateTime(element) {
//   const date = UTCizeDateTime(element.value);
//   if (date === undefined)
//     return "Invalid date & time. Match the pattern YYYY-MM-DD HH:MM.";
//   element.value = date.toISOString();
// }
// export function UTCizeDateTime(dateString) {
//   if (dateString.match(localizedDateTimeRegExp) === null) return;
//   const date = new Date(dateString.trim().replace(" ", "T"));
//   if (isNaN(date.getTime())) return;
//   return date;
// }

// export function isModified(element) {
//   const elementsToCheck = children(element);
//   for (const element of elementsToCheck) {
//     if (
//       parents(element).some((element) => element.isModified === false) ||
//       element.closest("[disabled]") !== null
//     )
//       continue;
//     if (parents(element).some((element) => element.isModified === true))
//       return true;
//     if (["radio", "checkbox"].includes(element.type)) {
//       if (element.checked !== element.defaultChecked) return true;
//     } else if (
//       typeof element.value === "string" &&
//       typeof element.defaultValue === "string"
//     )
//       if (element.value !== element.defaultValue) return true;
//   }
//   return false;
// }
// {
//   let isSubmittingForm = false;
//   window.addEventListener("DOMContentLoaded", () => {
//     isSubmittingForm = false;
//   });
//   document.addEventListener("submit", () => {
//     isSubmittingForm = true;
//   });

//   window.onbeforeunload = (event) => {
//     if (!isModified(document.querySelector("body")) || isSubmittingForm) return;
//     event.preventDefault();
//     event.returnValue = "";
//   };

//   window.onbeforelivenavigate = () =>
//     !isModified(document.querySelector("body")) ||
//     isSubmittingForm ||
//     confirm(
//       "Your changes will be lost if you leave this page. Do you wish to continue?",
//     );
// }

// export function serialize(element) {
//   const urlSearchParams = new URLSearchParams();
//   const elementsToCheck = children(element);
//   for (const element of elementsToCheck) {
//     const name = element.getAttribute("name");
//     if (typeof name !== "string" || element.closest("[disabled]") !== null)
//       continue;
//     if (element.type === "radio") {
//       if (element.checked) urlSearchParams.set(name, element.value);
//     } else if (element.type === "checkbox") {
//       if (element.checked) urlSearchParams.append(name, element.value ?? "on");
//     } else if (element.matches("input, textarea"))
//       urlSearchParams.set(name, element.value);
//   }
//   return urlSearchParams;
// }

// export function reset(element) {
//   const elementsToCheck = children(element);
//   for (const element of elementsToCheck) {
//     if (element.value !== element.defaultValue) {
//       element.value = element.defaultValue;
//       element.onchange?.();
//     }
//     if (element.checked !== element.defaultChecked) {
//       element.checked = element.defaultChecked;
//       element.onchange?.();
//     }
//   }
// }

// export const relativizeDateTime = (() => {
//   const relativeTimeFormat = new Intl.RelativeTimeFormat("en-US", {
//     localeMatcher: "lookup",
//     numeric: "auto",
//   });
//   const minute = 60 * 1000;
//   const hour = 60 * minute;
//   const day = 24 * hour;
//   const month = 30 * day;

//   return (
//     dateString,
//     {
//       preposition = undefined,
//       dateOnly = true,
//       capitalize: shouldCapitalize = false,
//     } = {},
//   ) => {
//     const dateTimeDifference =
//       new Date(dateString.trim()).getTime() - Date.now();
//     const absoluteDateTimeDifference = Math.abs(dateTimeDifference);
//     const dateDifference =
//       new Date(localizeDate(dateString)) -
//       new Date(localizeDate(new Date().toISOString()));
//     const absoluteDateDifference = Math.abs(dateDifference);
//     const relativeDateTime =
//       absoluteDateTimeDifference < minute
//         ? "just now"
//         : absoluteDateTimeDifference < hour
//           ? relativeTimeFormat.format(
//               Math.trunc(dateTimeDifference / minute),
//               "minutes",
//             )
//           : absoluteDateTimeDifference < day
//             ? relativeTimeFormat.format(
//                 Math.trunc(dateTimeDifference / hour),
//                 "hours",
//               )
//             : absoluteDateDifference < month
//               ? relativeTimeFormat.format(
//                   Math.trunc(dateDifference / day),
//                   "days",
//                 )
//               : `${preposition === undefined ? "" : `${preposition} `}${
//                   dateOnly
//                     ? localizeDate(dateString)
//                     : localizeDateTime(dateString)
//                 }`;
//     return shouldCapitalize ? utilities.capitalize(relativeDateTime) : relativeDateTime;
//   };
// })();

// export function relativizeDateTimeElement(element, options = {}) {
//   const target = options.target ?? element;
//   window.clearTimeout(element.relativizeDateTimeElementTimeout);
//   (function update() {
//     if (!isConnected(element)) return;
//     const dateTime = element.getAttribute("datetime");
//     setTippy({
//       element: target,
//       elementProperty: "relativizeDateTimeElementTooltip",
//       tippyProps: {
//         touch: false,
//         content: `${localizeDateTime(dateTime)} (${formatUTCDateTime(
//           dateTime,
//         )})`,
//       },
//     });
//     element.textContent = relativizeDateTime(dateTime, options);
//     element.relativizeDateTimeElementTimeout = window.setTimeout(
//       update,
//       10 * 1000 + Math.random() * 2 * 1000,
//     );
//   })();
// }

/**
 * Returns a date relative to today, for example, `Today`, `Yesterday`, `Tomorrow`, or `2024-04-03 · Wednesday`.
 */
export function relativizeDate(dateString) {
  const date = localizeDate(dateString);
  return date === localizeDate(new Date().toISOString())
    ? "Today"
    : date ===
        localizeDate(
          (() => {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            return date;
          })().toISOString(),
        )
      ? "Yesterday"
      : date ===
          localizeDate(
            (() => {
              const date = new Date();
              date.setDate(date.getDate() + 1);
              return date;
            })().toISOString(),
          )
        ? "Tomorrow"
        : `${date} · ${weekday(date)}`;
}

/**
 * Keep an updated relative date on the `element` while it’s connected to the document based on the `datetime` attribute, for example, `<time datetime="2024-04-03T14:51:45.604Z" javascript="${javascript`javascript.relativizeDateElement(this);`}"></time>`.
 */
export function relativizeDateElement(element) {
  element.relativizeDateElementBackgroundJob?.stop();
  element.relativizeDateElementBackgroundJob = utilities.backgroundJob(
    { interval: 60 * 1000 },
    () => {
      if (!isConnected(element))
        element.relativizeDateElementBackgroundJob.stop();
      element.textContent = relativizeDate(element.getAttribute("datetime"));
    },
  );
}

/**
 * Returns a string with the week day in English, for example, `Monday`.
 */
export function weekday(dateString) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(dateString.trim()),
  );
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
 * A regular expression that matches localized dates, for example, `2024-04-01 15:20`.
 */
export const localizedDateTimeRegExp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

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
 * Check whether the `element` is connected to the document. This is different from the [`isConnected` property](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected) in the following ways:
 *
 * 1. It uses `parents()`, so it supports Tippy.js’s tippys that aren’t mounted but whose `target`s are connected.
 *
 * 2. You may force an element to be connected by setting `element.forceIsConnected = true` on the `element` itself or on one of its parents.
 *
 * This is useful, for example, for elements that periodically update their own contents, for example, a text field that displays relative time, for example, “three hours ago”. You can check that the element has been disconnected from the document and stop the periodic updates.
 */
export function isConnected(element) {
  return parents(element).some(
    (ancestor) =>
      ancestor.forceIsConnected === true || ancestor.matches("html"),
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
