# TODO

## Introduction

- Example application
  - Basic
  - Complete
- Principles
  - Colocation
  - It’s better to have no abstraction at all than the wrong abstraction: it’s okay to repeat yourself a little, before DRYing
- Principles in action
  - Server-Side Rendering: Avoid distributed applications (a frontend that’s a separate application communicating through an API is a distributed application)
    - https://github.com/phoenixframework/phoenix_live_view
      - https://livewire.laravel.com/
      - https://stimulusreflex.com/
      - https://sockpuppet.argpar.se/
      - https://www.liveviewjs.com/
    - https://hotwire.dev
      - https://github.com/turbolinks/turbolinks
      - https://github.com/defunkt/jquery-pjax
  - Avoid external processes (for example, Redis, and use SQLite instead of Postgres)
  - Inline CSS and browser JavaScript
    - https://htmx.org/essays/locality-of-behaviour/
    - https://kentcdodds.com/blog/colocation
    - https://adamwathan.me/css-utility-classes-and-separation-of-concerns/
    - https://tailwindcss.com/docs/utility-first
    - https://vuejs.org/guide/scaling-up/sfc.html
    - https://html-first.com/
    - https://alpinejs.dev/
  - Use procedural instead of object-oriented code
    - https://www.youtube.com/watch?v=QM1iUe6IofM
  - Place code in as few files as possible
    - Language: Avoid Domain-Specific Languages (DSL), for example, what Rails does, CSS-in-JavaScript by the means of JavaScript objects, and so forth (use tagged templates instead)
    - APIs: Avoid virtual DOM
  - Stay as close to the platform as possible
  - Use descriptive names (avoid abbreviations)

## Authoring

### SQL

- Include `"id" INTEGER PRIMARY KEY AUTOINCREMENT` in every table.
- Use `STRICT`
- Quote table and column names (for example, `"users"."name"`), to avoid conflicts with SQL reserved keywords and to help with syntax highlighting.
- Put `` sql`___` `` on its own line because of a glitch in the syntax highlighting.

### HTML

- Use `key="___"` to control Live Navigation and Live Connection updates.

### CSS

- Define properties in the following order:
  1.  Font and text properties.
  2.  Colors, from foreground to background (for example, `color` then `background-color`).
  3.  Box model, from the inside out (for example, `width`, then `padding`, then `border`, then `margin`, then `outline`).
  4.  Positioning of element with respect to container (for example, `position`).
  5.  Positioning of children (for example, `display: flex;`).
  6.  Interactions (for example, `cursor`).
  7.  Transformations.
  8.  Animations.
  9.  States (in chronological order, for example, `:hover`, `:focus-within`, `:active`).
  10. Variations (for example, breakpoints and dark mode).
  11. Children, including `::before` and `::after`.
- Don’t use the same set of breakpoints all the time. Analyze case by case, and set breakpoints accordingly. (And besides, CSS variables don’t work for setting breakpoints, because they’re defined in `:root`, and the media query lives outside the scope of a selector.)
- Levels of abstraction
  - Inline styles
  - Extract a CSS class (for example, `.button`)
  - Extract a function that produces HTML (for example, `userAvatar()`)
  - Global styles (for example, font)
- Document: Don’t use `#ids`, because of specificity (use `key=""`s instead, for compatibility with `@radically-straightforward/javascript`)
- Use classes for everything, not just tag name selectors, because you may want an `<a>` to look like a button, and a `button` to look like a link.

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

---

---

# Self-Hosting

**Welcome!** 👋

You may use Courselore at [`courselore.org`](https://courselore.org), but you may prefer to run Courselore on your own server for maximum privacy and control. Courselore is easy to self-host and is an excellent first project if you’re new to system administration.

> **Note:** If you get stuck, please [open an issue](https://github.com/courselore/courselore/issues/new?body=%2A%2AWhat%20did%20you%20try%20to%20do%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20did%20you%20expect%20to%20happen%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20really%20happened%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20error%20messages%20%28if%20any%29%20did%20you%20run%20into%3F%2A%2A%0A%0A%0A%0A%2A%2APlease%20provide%20as%20much%20relevant%20context%20as%20possible%20%28operating%20system%2C%20browser%2C%20and%20so%20forth%29%3A%2A%2A%0A).

> **Note:** Join our community at [Meta Courselore](https://courselore.org/courses/8537410611/invitations/3667859788) to talk to the developers, request features, report bugs, and so forth.

## Requirements

- **Server.** This is the machine that will run Courselore. You may rent a server from a provider such as [DigitalOcean](https://www.digitalocean.com/) (this is what we use for [`courselore.org`](https://courselore.org)), [Linode](https://www.linode.com/), and so forth. You may also use a server provided by your educational institution, or a [Raspberry Pi](https://www.raspberrypi.com) that you have running in your closet.

  > **Note:** You need command-line access to the server.

  > **Note:** We recommend that Courselore is the only application running in the machine. Or, if you must, use containers to separate applications and give Courselore its own container.

  > **Note:** The server may run Linux, Windows, or macOS. We recommend Linux ([Ubuntu](https://ubuntu.com)).

  > **Note:** Courselore is lightweight. A $12/month DigitalOcean server is enough for a couple hundred users.

- **Email Delivery Service.** This is the service that will deliver emails on behalf of your server. You may use a service such as [Amazon SES](https://aws.amazon.com/ses/) (this is what we use for [`courselore.org`](https://courselore.org)), [SendGrid](https://sendgrid.com), and so forth. You may also use an email delivery service provided by your educational institution.

  > **Note:** In theory your server could try delivering emails directly instead of relying on an email delivery service. Courselore may be configured to do that, and it would be better for privacy because no data would be going through third-party services. Unfortunately, in practice your emails would likely be marked as spam or even be rejected by most destinations such as [Gmail](https://www.google.com/gmail/) and [Microsoft Outlook](https://outlook.live.com/). Courselore must be able to send emails to complete the sign-up process, to send notifications, and so forth, so it’s best to rely on an email delivery service which guarantees that emails will arrive at your users’ inboxes.

- **Domain/Subdomain.** This is a name such as `courselore.org`. You may buy a domain from providers such as [Namecheap](https://www.namecheap.com/) (this is what we use for `courselore.org`), [Amazon Route 53](https://aws.amazon.com/route53/), and so forth. You may also use a domain/subdomain provided by your educational institution, for example, `my-course.educational-institution.edu`.

  > **Note:** You need access to the DNS configuration for the domain/subdomain to set records such as “`my-course.educational-institution.edu` maps to the IP address of my server at `159.203.147.228`.”

  > **Note:** You must have a domain/subdomain dedicated to Courselore—you may not run Courselore under a pathname, for example, `educational-institution.edu/courselore/`. This is necessary to enable Courselore to manage cookies in the most secure way and to avoid conflicts with other applications that could be running on the same domain/subdomain under other pathnames.

## DNS Setup

Create an `A` Record pointing at your server’s IP address and `ALIAS` or `CNAME` Records for common subdomains, for example, `www`.

## Server Setup

1. [Download the latest Courselore release for your platform](https://github.com/courselore/courselore/releases). For example, from the Linux command line:

   ```console
   # mkdir courselore
   # cd courselore
   # wget https://github.com/courselore/courselore/releases/download/v<VERSION>/courselore--linux--v<VERSION>.tgz
   # tar xzf courselore--linux--v<VERSION>.tgz
   ```

2. Create a configuration file based on [`web/configuration/example.mjs`](/web/configuration/example.mjs). For example, from the Linux command line:

   ```console
   # wget -O configuration.mjs https://github.com/courselore/courselore/raw/main/web/configuration/example.mjs
   # nano configuration.mjs
   ```

   > **Note for Advanced Users:** The Courselore configuration is a JavaScript module. You may use JavaScript for more advanced configuration options, for example:
   >
   > - Read environment variables with `process.env.ENVIRONMENT_VARIABLE`.
   >
   > - Load secrets from a different file instead of hard-coding them. For example, see how [`web/configuration/courselore.org.mjs`](/web/configuration/courselore.org.mjs) loads secrets from a file called `secrets.json`.

3. Test the configuration by running Courselore:

   ```console
   $ ./courselore configuration.mjs
   ```

   > **Note:** Stop Courselore with `Ctrl+C`.

4. Configure your operating system’s service manager to start Courselore on boot and restart it in case it crashes. For example, you may use Ubuntu’s service manager [systemd](https://systemd.io) with the configuration we use for [`courselore.org`](https://courselore.org) at [`web/configuration/courselore.service`](/web/configuration/courselore.service):

   ```console
   # wget -O /etc/systemd/system/courselore.service https://github.com/courselore/courselore/raw/main/web/configuration/courselore.service
   # systemctl daemon-reload
   # systemctl start courselore
   # systemctl enable courselore
   ```

   > **Note:** When you run Courselore for the first time, create an account for yourself, because the first account that is created is granted system administrator privileges.

## Backup

With the default configuration, all the data generated by Courselore lives on the `data/` directory next to the configuration file. Backup that directory using your usual backup strategies. For example, using macOS you may download all the data to a local hard drive:

```console
$ rsync -av --progress --delete YOUR-USER@YOUR-SERVER.EDU:PATH-TO-COURSELORE/data/ /Volumes/HARD-DRIVE/courselore-data/
```

> **Note:** If Courselore is running while you run the backup, [there’s a small chance that the database files will be in an invalid state](https://sqlite.org/howtocorrupt.html#_backup_or_restore_while_a_transaction_is_active). We recommend that you stop Courselore during the backup if you can.

## Update

> **Important:** [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)

> **Important:** Major updates (for example, 1.x.x → 2.x.x) include **required** extra manual steps. Minor updates (for example, x.1.x → x.2.x) include **optional** manual steps.
>
> If you’re updating across multiple major & minor versions, then you may update the configuration file with respect to the latest version, but you must follow all other steps for all the versions in between (for example, to update 1.2.3 → 3.2.5 use a configuration file compatible with 3.2.5, but follow the other steps for 1.2.3 → 2.0.0 → 2.1.0 → 2.2.0 → 3.0.0 → 3.1.0 → 3.2.5 as well).
>
> Refer to the [changelog](https://github.com/courselore/courselore/blob/main/CHANGELOG.md) for more information.

> **Note:** You may be notified about new Courselore releases in the following ways:
>
> **Courselore Footer:** Courselore checks for updates. When a new version is available Courselore notifies administrators with a button in the footer of the main Courselore interface as well as log messages in the console.
>
> **GitHub Notifications:** Watch for releases in the [Courselore repository](https://github.com/courselore/courselore/) using the **Watch > Custom > Releases** option.
>
> **Atom Feed:** Subscribe to the [releases Atom feed](https://github.com/courselore/courselore/releases.atom).
>
> **Email:** Use [CodeRelease.io](https://coderelease.io/) or sign up to the [releases Atom feed](https://github.com/courselore/courselore/releases.atom) via services such as [Blogtrottr](https://blogtrottr.com/) or [IFTTT](https://ifttt.com).

[Download the latest Courselore release for your platform](https://github.com/courselore/courselore/releases) and restart the server. For example, if you followed the examples from [§ Server Setup](#server-setup), you may do the following:

```console
# rm courselore
# wget https://github.com/courselore/courselore/releases/download/v<VERSION>/courselore--linux--v<VERSION>.tgz
# tar xzf courselore--linux--v<VERSION>.tgz
# systemctl restart courselore
```

---

---

---

## Running a Pre-Compiled Binary Locally

The best way to get started is to run a pre-compiled Courselore binary on your machine. You may download Courselore from two channels: The latest development versions, which are available as [Actions Artifacts](https://github.com/courselore/courselore/actions); and stable versions, which are available as [Releases](https://github.com/courselore/courselore/releases). After you downloaded Courselore, extract it and run the `courselore` binary.

> **Note:** You must be signed in to GitHub to download GitHub Actions Artifacts.

> **Note:** Most Linux distributions prevent regular users from binding to network ports lower than 1024. This is a setting that [you should disable](https://github.com/small-tech/auto-encrypt/tree/a917892b93b61cd3b80a6f3919db752e2c5a9f6c#a-note-on-linux-and-the-security-farce-that-is-privileged-ports).

> **Note:** Courselore may ask for your password before running. This happens because it runs with HTTPS—not HTTP—in development to reduce confusion around some browser features that work differently under HTTPS. To accomplish this, it needs to install local TLS certificates on your operating system’s trust store. Courselore relies on [Caddy](https://caddyserver.com) to manage this process.

> **Note:** Firefox may have issues with the local TLS certificate used by Courselore because by default Firefox uses its own trust store. There are two possible solutions for this:
>
> 1. Configure Firefox to use the operating system’s trust store by visiting `about:config` and setting `security.enterprise_roots.enabled` to `true`.
>
> 2. Use NSS to install the Caddy root TLS certificate into Firefox’s trust store.

---

---

# Measuring Performance (Profiling & Load Testing)

We use two tools to measure the performance of slow pages:

1. [0x](https://www.npmjs.com/package//0x): Profile the application and generate [flame graphs](https://www.brendangregg.com/flamegraphs.html).
2. [autocannon](https://www.npmjs.com/package//autocannon): Load test (send lots of requests) and measure response time (which autocannon calls “latency”) & throughput.

Here’s a step-by-step guide of how to use these tools in Courselore:

1. Run the application normally.

   > **Note:** Don’t use a custom `HOSTNAME`, because autocannon may not recognize the self-signed certificate generated by Caddy.

2. Setup what you need, for example, create demonstration data.
3. Take note of the information necessary to reproduce the request of interest, including cookies, URL, and so forth, for example:

   ```console
   $ npx autocannon --duration 5 --headers "Cookie: __Host-Session=Vsd6eB9gtfjCuK2TTxiUINfn8PoPMYLMWASxnabSz9XMBGS5sHijmrrUDJ15vUF2aGWlsfPh4hkjclsgXrwir3aqvgtIE2VD5ZeH" https://localhost/courses/4453154610/conversations/33
   ```

4. Stop the server and restart it in profile mode:

   ```console
   $ npm run start:profile
   ```

5. Create load on the server, for example:

   ```console
   $ mkdir -p ./data/measurements/
   $ npx autocannon --duration 120 --latency --renderStatusCodes --json --headers "Cookie: __Host-Session=Vsd6eB9gtfjCuK2TTxiUINfn8PoPMYLMWASxnabSz9XMBGS5sHijmrrUDJ15vUF2aGWlsfPh4hkjclsgXrwir3aqvgtIE2VD5ZeH" https://localhost/courses/4453154610/conversations/33 > ./data/measurements/latency-and-throughput.txt 2>&1
   ```

   > **Note**: You may want to watch the system resources while the test is running. For example, in macOS, use Activity Monitor.

6. Stop the server and see the measurements at `./data/measurements/`.

   > **Note:** If you wish to keep these measurements, then rename the folder, because it will be overwritten the next time you run the server in profile mode.

---

---

---

## `@radically-straightforward/server`

## `@radically-straightforward/sqlite`

## `@radically-straightforward/html`

## `@radically-straightforward/css`

## `@radically-straightforward/javascript`

- TypeScript in browser JavaScript.
- Client-side templating from within server-side templating:

  ```javascript
  response.end(html`
    <div javascript="${javascript`
      this.insertAdjacentHTML("beforestart", html`[...] ${HAVE THIS RESOLVE ON THE CLIENT} [...]`);
    `}"></div>
  `);

  ```

## `@radically-straightforward/utilities`

## `@radically-straightforward/node`

- Application startup (process management)
  - Different children processes
  - Tunnel
    - Start Caddy with `address` `http://localhost`, then create a port forwarding in Visual Studio Code to port 80, public.
  - Profiling
  - Source maps

## `@radically-straightforward/typescript`

## `@radically-straightforward/documentation`

## `@radically-straightforward/caddy`

## `@radically-straightforward/build`

## `@radically-straightforward/package`

## `@radically-straightforward/production`

## `@radically-straightforward/development`

## Other

- Better text editor support for tagged templates with 100% functional syntax highlighting and IntelliSense.

## Marketing

- Logo
- Dedicated website
- Conference talks
- Videos
- Podcasts
