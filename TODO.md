# TODO

- JAVASCRIPT-PACKAGE-EXAMPLE
- Can we get by without `cache: "no-store"` on every `fetch()`?
- globby → Node.js’s fs glob
- nodemon

---

`@radically-straightforward/utilities`’s `intern` performance benchmark:

```typescript
const iterations = 1000;
console.time("intern()");
const objects = [];
for (let iteration = 0; iteration < iterations; iteration++) {
  const entries = [];
  for (let key = 0; key < Math.floor(Math.random() * 15); key++) {
    entries.push([String(key + Math.floor(Math.random() * 15)), true]);
  }
  objects.push($(Object.fromEntries(entries)));
  objects.push($(entries.flat()));
}
// console.log($.pool.record.size);
console.timeEnd("intern()");
```

## Features

- `javascript`
  - Browser JavaScript
  - Documentation
- Application startup (process management)
  - Different children processes
  - Tunnel
    - Start Caddy with `address` `http://localhost`, then create a port forwarding in Visual Studio Code to port 80, public.
  - Profiling
  - Source maps
- Use SQLite as queue:
  - https://github.com/collectiveidea/delayed_job/tree/11e0212fb112c5e11e4555ef1e24510819a66347#gory-details
  - https://sqlite.org/forum/info/b047f5ef5b76edff
  - https://github.com/StratoKit/strato-db/blob/master/src/EventQueue.js
  - https://github.com/litements/litequeue
  - https://www.npmjs.com/package/better-queue-sqlite
  - https://github.com/bensheldon/good_job
  - https://github.com/betterment/delayed
- Guides
  - Setting up for development
  - Deployment
  - Authoring
- Developer experience
  - Better text editor support:
    - Syntax highlighting
    - IntelliSense
  - TypeScript on browser JavaScript?

## Documentation

- Overarching story
  - Colocation (Tailwind, https://vuejs.org/guide/scaling-up/sfc.html, and so forth)
  - Avoid DSLs
  - Avoid distributed applications (a frontend that’s almost a separate application **is** a distributed application)
  - Avoid external processes (for example, Redis)
  - Avoid multiple files
  - Resist the urge to abstract early, because may have the wrong abstraction, and a wrong abstraction is a bigger issue than no abstraction (repetition is okay, DRY isn’t always the way)
  - Spaghetti code vs soup of unknown objects
  - Related work
    - <https://html-first.com/>
    - <https://tailwindcss.com/>
    - <https://htmx.org/>
    - <https://alpinejs.dev/>
    - <https://hotwire.dev>
    - <https://github.com/defunkt/jquery-pjax>
    - <https://laravel-livewire.com>
    - <https://github.com/phoenixframework/phoenix_live_view>
    - <https://cableready.stimulusreflex.com/>
    - <https://sockpuppet.argpar.se/>
    - <https://github.com/servicetitan/Stl.Fusion>
- Logo
- Dedicated website?

# Authoring

## SQL

- `INTEGER PRIMARY KEY AUTOINCREMENT`
- `STRICT`
- `"quote"` table and column names

---

- Include `"id" INTEGER PRIMARY KEY AUTOINCREMENT` in every table.
- Quote table and column names (for example, `"users"."name"`), to avoid conflicts with SQL reserved keywords and to help with syntax highlighting.
- Put `` sql`___` `` on its own line because of a glitch in the syntax highlighting.

## CSS

- Define properties in the following order:
  1.  Font and text properties.
  2.  Colors, from foreground to background (for example, `color` then `background-color`).
  3.  Box model, from the inside out (for example, `width`, then `padding`, then `border`, then `margin`, then `outline`).
  4.  Positioning of element with respect to container (for example, `position`).
  5.  Positioning of children (for example, `display: flex;`).
  6.  Interactions (for example, `cursor`).
  7.  Transformations.
  8.  Animations.
  9.  States (for example, `:hover`).
  10. Variations (for example, breakpoints and dark mode).
  11. Children, including `::before` and `::after`.
- Don’t use the same set of breakpoints all the time. Analyze case by case, and set breakpoints accordingly. (And besides, CSS variables don’t work for setting breakpoints, because they’re defined in `:root`, and the media query lives outside the scope of a selector.)
- Layers
  - Global styles (for example, font)
  - Components for things like form inputs and buttons
  - Inline styles everywhere else
- Extraction: Often it doesn’t make sense to extract CSS, because it doesn’t make sense without the corresponding HTML structure. It makes more sense to extract HTML & CSS into a function.
- Document: Don’t use `#ids`, because of specificity (use `key=""`s instead, for compatibility with `@radically-straightforward/javascript`)
- Use classes for everything, not just tag name selectors, because you may want an `<a>` to look like a button, and a `button` to look like a link.
- Interpolation
  - What I think of as interpolation many libraries call “dynamic” properties/styles/etc.
  - Astroturf
    - Allows two types of interpolation:
      - Values, using CSS variables.
      - Blocks, using extra classes.
        - Doesn’t seem to support nesting, because that requires you to parse the CSS & extract the classes nested inside.
  - vanilla-extract
    - Doesn’t seem to allow for interpolation.
  - Linaria
    - Only interpolation of values, using CSS variables.
  - Compiled
    - No interpolation at all

# TODO

```typescript
import childProcess from "node:child_process";
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";

const application = server();

css`
  @import "@radically-straightforward/javascript/static/index.css";

  .tippy-box {
    --background-color: blue;
    --border-color: red;
  }

  [key="progress-bar"] {
    background-color: pink;
  }
`;

javascript`
  import * as javascript from "@radically-straightforward/javascript/static/index.mjs";

  javascript.configuration.environment = "development";
`;

application.push({
  method: "GET",
  handler: (request, response) => {
    if (
      request.liveConnection?.establish &&
      request.liveConnection?.skipUpdateOnEstablish
    )
      response.end();
  },
});

application.push({
  method: "GET",
  pathname: "/",
  handler: (request, response) => {
    response.redirect("/1");
  },
});

application.push({
  method: "GET",
  pathname: "/1",
  handler: (request, response) => {
    response.end(
      layout({
        request,
        response,
        body: html`
          <p>
            ${new Date().toISOString()}: This is /1, <a href="/2">go to /2</a>.
          </p>
        `,
      })
    );
  },
});

application.push({
  method: "GET",
  pathname: "/2",
  handler: (request, response) => {
    response.end(
      layout({
        request,
        response,
        body: html`
          <p>
            ${new Date().toISOString()}: This is /2, <a href="/1">go to /1</a>.
          </p>
        `,
      })
    );
  },
});

function layout({
  request,
  response,
  body,
}: {
  request: serverTypes.Request<{}, {}, {}, {}, {}>;
  response: serverTypes.Response;
  body: HTML;
}): HTML {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="version" content="1.0.0" />
        <link rel="stylesheet" href="/${caddy.staticFiles["index.css"]}" />
        <script src="/${caddy.staticFiles["index.mjs"]}"></script>
      </head>
      <body
        javascript="${javascript`
          javascript.liveConnection(${request.id});
        `}"
      >
        $${body}
      </body>
    </html>
  `;
}

const caddyServer = childProcess.spawn(
  "./node_modules/.bin/caddy",
  ["run", "--adapter", "caddyfile", "--config", "-"],
  { stdio: [undefined, "ignore", "ignore"] }
);
caddyServer.stdin.end(caddy.application());
process.once("gracefulTermination", () => {
  caddyServer.kill();
});
```

---

- Live Connection
  - Detect that you’re offline.
  - Detect a server version update. (Trigger a reload in that case)
  - Live Reload in development.
  - Live Update when there’s a new version of the page.

---

- It’d be nice to allow for client-side templating from within server-side templating:

```javascript
response.send(html`
  <div javascript="${javascript`
    this.insertAdjacentHTML("beforestart", html`[...] ${HAVE THIS RESOLVE ON THE CLIENT} [...]`);
  `}"></div>
`);

```

---

Pulling client-side JavaScript into a `<script>` tag, as opposed to leaving it inline:

Pros:

- Clean up the Inspector in the Developer Tools.
- Potential to reduce the size of HTML.
- Aligns with the treatment of CSS, and even of HTMLForJavaScript, to some extent.

Cons:

- Introduces one layer of indirection in the Inspector.
- The size reduction could have happened with gzip, which sometimes is even better.
- Slows things down on the server because it has to compute the hash of all client-side JavaScript. (The same is true of CSS, by the way.)

---

One (perhaps valuable) difference between `morph()` and other solutions like `morphdom`: `morph()` does’t destroy the `to` tree, while `morphdom` does.

```css
[live-navigation] * {
  cursor: wait !important;
}
.[live-navigation] {
  &,
  & *,
  & ::before,
  & ::after {
    cursor: wait !important;
  }
}
```

- `key=""` may be understood to imply uniqueness at first glance

  - Perhaps it would be nicer to have more structure in the key besides just a string.

- Currently `onload` may be adding a bunch of repeated JavaScript, adding to the size of the page. Perhaps we should do something similar to what we do in `local-css`?

  - Note that modifying the `textContent` of `<script>` tag only has immediate effect the first time(!) Subsequent modifications aren’t picked up by the browser (but you can always `eval()`).

- Make `onload` an `AsyncFunction`?

- Document

  - Reasons to prefer `fetch` over `EventSource`:
    - Features such as headers.
    - Implementors lost interest on `EventSource` (https://github.com/whatwg/html/issues/2177).
    - Free to use a more sensible event-stream format, such as NDJSON, instead of the weird `text/event-stream` format.
  - Reasons to have one event-stream connection per route, and close and reopen as you navigate, as opposed to a single persistent event-stream connection:
    - Session management would be awkward
    - Extra work to not have event-stream open for routes that don’t support them (otherwise it increases the server load for no good reason) (but most of the time people are on routes that support live updates, so it’s no big deal).
    - The live-updates middleware benefits from appearing after authentication and retrieval of things like course information. It’d be awkward to have it as a global middleware.
  - Reasons not to use the Visibility API:
    - First, the obvious pro: We could disconnect the live-updates event-stream when the tab isn’t showing, reducing the load on the server.
    - But we decided against it because we want to be able to have features such as changing a tab title to “2 unread messages,” even if the tab is on the background, and this requires the connection to the server to be kept alive.
  - Assumptions on `onload`:
    - It’s only safe to run `onload` once.
    - The code will be run again on live-navigation & live-update, and there may be some continuity in the form of tooltips & event handlers.
  - Redirects:
    - Use 307 (temporary) & 308 (permanent) on normal redirects. (They preserve the HTTP method on the new request.)
    - Use 303 on redirects after a `POST`. (It changes the HTTP method from `POST` to `GET` on the new request.) (Naturally, the same principle applies to other HTTP methods, including `PATCH`, `PUT`, `DELETE`, and so forth.)
    - Don’t use 302 (temporary) & 301 (permanent), because some browsers may change the method on redirect. Prefer 307 & 308 instead.
  - Curious fact about `.addEventListener("EVENT")` vs `.onEVENT = `: The order in which you put the `.onEVENT = ` adds an entry into the event listeners queue at that position, and subsequent `.onEVENT = `s replace that entry.

- Tests:
  - https://www.ssllabs.com/ssltest/
  - Content-Security-Policy
    - https://csp-evaluator.withgoogle.com
    - https://securityheaders.com
  - https://hstspreload.org

<details>

# My Version of morphdom

## Essential Features (And How It’s Different from morphdom and nanomorph)

- **Key.**
  - Serves two purposes:
    1. Distinguishes between components that rely on the same tag.
       - For example, `<div key="conversations">` and `<div key="new-conversation">`
       - Prevents trying to morph between completely unrelated components, which is a lot of unnecessary work compared to a complete replacement.
       - Also useful to force similar elements to be treated differently, for example, `<input>`s on live-updates, which otherwise would have their `value`s preserved.
       - Similar to React’s named components (`<TagsWhichStartWithACapitalLetter>`), and to nanomorph’s `data-nanomorph-component-id`.
       - When used for this purpose, may repeat between siblings (unlike React’s `key`s, but like `data-nanomorph-component-id`).
    2. Allows for reordering of list-like elements.
       - Similar to React’s `key`s.
       - When used for this purpose, shouldn’t repeat between siblings (like React’s `key`s).
  - Notes:
    - It’s okay to mix and match between these two purposes (2 is actually a subcase of 1).
    - Even when using for purpose 2, the only needs to be unique among siblings—it may repeat across the document (like React’s `key`s, unlike `id`s).
- **Longest Common Subsequence (LCS).**
  - Minimize modifications to the DOM in cases of insertions, deletions, and transpositions, particularly in the middle of the list of child nodes.
    - Preserve state such as scrolling position, input caret positions, CSS transitions, hidden state, and so forth.
  - May alleviate some of the manual work of assigning keys for purpose 1.
  - Performance-wise, minimizing modifications to the DOM makes things faster but computing the LCS makes things slower, and whether the trade-off is worth it is up in the air.
  - This is what React seems to do. Contrary to [their documentation](https://reactjs.org/docs/reconciliation.html#recursing-on-children), even without keys React recognizes an insertion in the middle of a list without `key`s.
  - Doesn’t handle the case of a subtree being moved from one part of the document to a completely unrelated part.
    - In that case, the subtree is deleted, and a new equivalent subtree is inserted at the destination.
    - Similar to React.
    - In practice this seems to be reasonable approach.
    - The reason for this heuristic is that this general problem of subtree similarity is slow to compute (O(n³)).
    - morphdom actually has a workaround for this using `id`s, but we haven’t implemented anything like that.
- Also, unlike morphdom and nanomorph, we don’t modify the destination DOM node (we use `.importNode()` instead) so you don’t have to discard it.

## Desirable Features

- Separate `diff` & `patch`, so that the `diff` may be done on the server, and the `patch` on the client.
  - This is more work for the server, but minimizes data on the wire and load on the client, which may be advantageous, particularly for people on mobile connections, in which case it’s reasonable to expect the internet to be slower and the device to be less powerful.

## Ideas

- Use `.isEqualNode()`.
  - Seems like a good idea in theory, but in practice may introduce overhead and something as simple as a new `html-for-javascript--<number>` makes nodes different.
  - Elm seems to do something similar, but because it uses a virtual DOM the `.isEqualNode()` boils down to comparison by identity. Besides, every part in the construction of the virtual DOM is cached, making things even faster. (But Elm makes you jump through some hoops to maintain the invariants that make all this possible. And it’s a different language to learn.)
- Right now, when a node isn’t an element (for example, it’s text, or a comment), its `.nodeValue` is part of its identity, which means in case some text has changed, we remove and add nodes. We could remove the `.nodeValue` from the identity and sync it, similar to how we sync attributes on elements.
  - Advantage: Possibly less addition/deletion of siblings.
  - Disadvantage: Possibly more shuffling things around, as we have less information for LCS.
- Maybe `<input type="file">` shouldn’t be morphed under some circumstances, because we can’t reset their `.files`.
- Add support for namespaced attributes?
- Add support for `<select>` & `<option>`? (See https://github.com/patrick-steele-idem/morphdom/blob/master/src/specialElHandlers.js & https://github.com/choojs/nanomorph/blob/master/lib/morph.js)

## Related Work

- **Similar Libraries.**
  - <https://npm.im/morphdom>
    - Transposition is only handled via `id`s, which are global, not scoped to siblings.
    - [Doesn’t handle well the case of insertions in the middle, losing state (for example, scrolling position) of siblings, because it detaches and reattaches them](https://github.com/patrick-steele-idem/morphdom/issues/200).
  - <https://npm.im/nanomorph>
    - Transposition is only handled via `id`s, which are global, not scoped to siblings.
      - Maybe it could be handled with `data-nanomorph-component-id`, but still, as far as I understand, it doesn’t do LCS, and probably detaches and reattaches elements similar to morphdom.
    - No lifecycle callbacks (though most of them are subsumed by other mechanisms, for example, `.isSameNode()`).
    - Transferring callback handlers seems heavy-handed (though it may be a good idea in practice).
  - Others
    - Rely on some notion of virtual DOM or introduce abstractions and opinions in terms of how components should be specified.
- **Implementations of the Algorithms (See below for Algorithms Themselves).**
  - https://github.com/YuJianrong/fast-array-diff
    - The output is minimal and the performance is good
    - Claims to use less memory but be slower than `diff`.
    - More popular
    - Ended up using it because it comes with ESM version in the npm package, making it easy to use with Rollup.
  - https://github.com/gliese1337/fast-myers-diff
    - The output is minimal and the performance is good
    - I’m not a huge fan of the generator-based API, but I understand its purpose
    - Reasons to not go with it:
      - It’s less popular than fast-array-diff
      - The npm package doesn’t include an ESM version. (We could always fetch the source, but that’s less ergonomic.)
  - https://github.com/kpdecker/jsdiff (diff)
    - Good, but may be a bit bloated, given that it solves several cases, for example, splitting text.
  - https://github.com/flitbit/diff (deep-diff)
    - Deal-breaker: Doesn’t generate optimal diffs.
  - https://github.com/AsyncBanana/microdiff
    - Deal-breaker: Doesn’t generate optimal diffs.
    - It’s focused on being fast, having a small bundle size, and supporting data structures such as `Date`s and cyclic objects.
  - https://github.com/wickedest/myers-diff
    - Text-only
  - https://github.com/tapirdata/mdiff
    - Weird API, doesn’t look as polished.
  - https://github.com/Two-Screen/symmetry/
    - [Doesn’t seem to be super-optimized](https://github.com/Two-Screen/symmetry/blob/86644f6585e714fe00a9bb7068980188abb7ba5b/src/diff.ts#L241).
    - Supports many data types, which is more than we need.
- **Algorithms.**
  - [React Reconciliation](https://reactjs.org/docs/reconciliation.html)
    - Claims to be linear time (`O(n)`), but it’s getting right some insertions in the middle of a list, which I don’t think one can do in linear time 🤷
  - LCS:
    - Myers
      - Canonical sources:
        - <http://www.xmailserver.org/diff2.pdf>
        - <https://publications.mpi-cbg.de/Miller_1985_5440.pdf>
      - Other people explaining it:
        - <https://blog.jcoglan.com/2017/02/12/the-myers-diff-algorithm-part-1/>
        - <https://blog.robertelder.org/diff-algorithm/>
        - <https://tiarkrompf.github.io/notes/?/diff-algorithm/>
      - Improvements:
        - <https://neil.fraser.name/writing/diff/>
        - <https://www.sciencedirect.com/science/article/abs/pii/002001909090035V>
      - Implementations:
        - <http://www.mathertel.de/Diff/>
        - <https://github.com/git/git/blob/a68dfadae5e95c7f255cf38c9efdcbc2e36d1931/xdiff/xdiffi.c> (see folder for alternative algorithms)
      - Notes:
        - It seems to be used by `diff`, `git`, and so forth.
    - Patching:
      - <https://neil.fraser.name/writing/patch/>
      - Notes:
        - This relevant when we get to the idea of doing diffing on the server and patching on the client.
        - It isn’t trivial because the client may have changed the DOM ever so slightly, and we must use the context to apply the patch, as well as deal with conflicts.
    - Wagner–Fischer
      - <https://dl.acm.org/doi/10.1145/321796.321811>
      - Notes:
        - This is the original dynamic-programming implementation that sidesteps the exponential complexity of the brute-force approach.
    - Heckel
      - <http://documents.scribd.com/docs/10ro9oowpo1h81pgh1as.pdf>
      - Notes:
        - Includes **move** operations.
        - Deal-breaker: Makes more inserts/deletes: <https://neil.fraser.name/writing/diff/> §2.3
    - Patience Diff
      - Original explanation: <https://bramcohen.livejournal.com/73318.html>
      - Other people explaining it:
        - <https://blog.jcoglan.com/2017/09/19/the-patience-diff-algorithm/>
        - <http://bryanpendleton.blogspot.com/2010/05/patience-diff.html>
        - <https://alfedenzo.livejournal.com/170301.html>
        - <https://stackoverflow.com/questions/40133534/is-gits-implementation-of-the-patience-diff-algorithm-correct/40159510#40159510>
      - Implementations:
        - <https://www.npmjs.com/package/patience-diff>
      - Notes:
        - Supposedly easy to implement and linear performance.
        - Focuses on making diffs readable, which isn’t a high priority for us.
        - Relies on the notion of low-frequency vs high-frequency elements, which may not be applicable.
        - Seems to be slower than Myers.
        - Deal-breaker: [Makes more insert/deletes](https://gist.github.com/roryokane/6f9061d3a60c1ba41237).
    - Surveys:
      - <https://en.wikipedia.org/wiki/Edit_distance>
      - <https://en.wikipedia.org/wiki/Longest_common_subsequence_problem>
      - <https://en.wikipedia.org/wiki/Diff>
      - <https://wordaligned.org/articles/longest-common-subsequence>
      - <https://wiki.c2.com/?DiffAlgorithm>
      - Includes the notion of blocks: <https://ably.com/blog/practical-guide-to-diff-algorithms>
        - I don’t that the notion of blocks apply because DOM manipulations don’t afford for that.
  - Sorting algorithms for `key`s:
    - Probably minimizes manipulation to the DOM in the general case: <https://en.wikipedia.org/wiki/Insertion_sort>
    - Probably minimizes manipulation to the DOM when the siblings have been reordered, but not inserted/deleted: <https://en.wikipedia.org/wiki/Cycle_sort>
    - May also be relevant: <https://en.wikipedia.org/wiki/Selection_sort>
    - And the merge part of Merge Sort may also be relevant: <https://en.wikipedia.org/wiki/Merge_sort>
  - Tree edit distance:
    - This would be the optimal solution because it finds subtree movements across the tree, not limited to reordering siblings at a given level. Unfortunately, it’s too costly to be practical, so it makes sense to follow React’s heuristic of handling that edge case by destructing and reconstructing the subtree. Effectively, this turns the tree edit distance into a bunch of LCS problems, which are more tractable.
    - https://grfia.dlsi.ua.es/ml/algorithms/references/editsurvey_bille.pdf
    - http://tree-edit-distance.dbresearch.uni-salzburg.at/
    - https://stackoverflow.com/questions/1065247/how-do-i-calculate-tree-edit-distance
    - https://dl.acm.org/doi/10.1145/2699485

# Nonstandard Tags (Custom Elements) & Attributes

- We actually end up doing the exact opposite of the “best practices” 😛
- We don’t use nonstandard tags (custom elements) (for example, `<x-conversations></x-conversations>`) (instead, we use `<div key="conversation"></div>`).
  - Pros:
    - Cleaner.
  - Cons:
    - May require a bit more of explicit styling, because by default custom tags are inline elements but most components behave like block elements.
    - Are less familiar to some people.
    - Dealbreaker: Don’t work well when the component relies on a tag that has intrinsic meaning, for example, `<button>`. In that case, it would require registering it with JavaScript, adding a polyfill for Safari, and so forth.
- We do use nonstandard attributes (for example, `key`, `onload`, and so forth).
  - Pros:
    - Cleaner.
  - Cons:
    - New developers could mistake these for standard attributes.
    - It may clash with standard attributes in the future.
      - In practice, we can cross that bridge when we get to it.
      - Besides, some attributes such as `key` are used by React, so they’re a de-facto standard.
  - We could just use `data-`, but that’s more verbose…
- Bonus “bad practice” 😛:
  - We add attributes to DOM elements as we see fit (for example, `element.tooltip`, and so forth).
  - `dataset` doesn’t work because some of these attributes aren’t strings.
  - We could have namespaced them, like Tippy.js does with `_tippy`.
  - Let’s wait for it to become a problem…
  - We aren’t using `<template>`s because they prevent `.querySelector()` from getting into them. In many cases (for example, tooltips), we actually want to `.querySelector("[onload]")`, and in cases we doing, we can always resort to `onloadpartial`.

</details>

# Testing

- Desirable features
  - Colocate tests and implementation
  - Snapshot
  - No globais
  - No separate executable
- Tools to use
  - https://nodejs.org/api/assert.html
  - Use process.on to register tests
  - https://github.com/substack/tape
- webpack (perhaps others) should be able to remove blocks of test from within the code when bundling.
- References
  - https://github.com/facebook/jest/tree/main/packages/jest-snapshot
  - https://kentcdodds.com/blog/colocation
  - https://users.rust-lang.org/t/should-unit-tests-really-be-put-in-the-same-file-as-the-source/62153/4
  - The D Programming Language supports writing unit tests inline with source
  - Pyret
  - Python doctests
  - https://github.com/eric1234/test_inline/wiki/Trade-offs
  - https://sergimansilla.com/blog/extending-js-inline-unit-tests/
  - https://news.ycombinator.com/item?id=6707168
  - https://github.com/facebook/jest/issues/4316
  - https://github.com/bowd/jest-same-file-tests
  - https://vitest.dev/guide/features.html#in-source-testing

## Related Work

- <https://github.com/patrick-steele-idem/morphdom>
- <https://github.com/choojs/nanomorph>
- <https://github.com/alpinejs/alpine/tree/main/packages/morph>

## Transitions

- https://barba.js.org
- https://swup.js.org/getting-started
- https://unpoly.com
- https://youtube.github.io/spfjs/

## Pre-Fetching

- https://getquick.link/

# Server

## Router

- Use Node.js `http.createServer()`’s options `IncomingMessage` and `ServerResponse` instead of ad-hoc extending the `request` and `response` objects? (https://stackoverflow.com/questions/70034891/extending-http-incomingmessage-and-http-serverresponse-providing-it-to-the-htt)
- Route based on other aspects of request, for example, `search`?

## Request Parsing

- Pass `pathname` parameters through `decodeURIComponent`?
- In the case of a request with a file that is too big, the server may not stop writing the file to the filesystem early enough, abusing the server resources (for example, disk).
- Different charsets?
- `Content-Encoding` (for example, compression)?

## Response Helpers

- Do we really don’t have to worry about `Content-Length`?
  - Node.js already sets `Content-Length` if you use `end()`. If you use `write()` Node.js sets chunked transfer.
  - If necessary we could use `Buffer.byteLength()` to determine the `Content-Length`

## Live Connection

- Don’t traverse the set of connections: Index by `request.id` and by `request.URL.pathname` (with hierarchical indexing, similar to proposal for `utilities.intern`)

## Image/Video/Audio Proxy

- Edge cases
  - Test redirect loop
  - Test timeout 10s
  - Limit size?
- Range requests?
- Resize images?
- Cache? Not only for performance, but also because third-party images may go away
- Include HMAC?
  - Perhaps not, because as far as I understand the purpose of HMAC is to prevent abuse, but hotlinked images can only be used from our website anyway due to Cross-Origin-Resource-Policy. In other words, you can’t hotlink a hotlinked (proxied) image. This saves us from having to compute & verify HMACs.

## CSRF Protection

- Currently we’re defending from CSRF by requiring a custom header. This is the simplest protection mechanism, but it’s vulnerable to broken environments that let cross-site requests include custom headers (for example, old versions of Flash).
- [Synchronizer tokens](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern) are the most secure option.
  - Communicate the token to the server with the custom header (`CSRF-Protection`), combining the synchronizer token with the custom header approach.
  - Let the synchronizer tokens be session-wide, not specific per page, so as to not break the browser “Back” button.
  - Couple the synchronizer token to the user session.
  - Have pre-sessions with synchronizer tokens for signed out users to protect against login CSRF.
- In case the implementation of the synchronizer token doesn’t go well, try to use the [double-submit pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#alternative-using-a-double-submit-cookie-pattern).
  - It requires a secret known by the server to implement most securely. Note how everything boils down to the server recognizing itself by seeing a secret piece of data that it created.

## Convenient Defaults

- Rate limiting
  - Could be done on Caddy with extension
