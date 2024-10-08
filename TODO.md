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

## `@radically-straightforward/server`

- Router
  - Use Node.js `http.createServer()`’s options `IncomingMessage` and `ServerResponse` instead of ad-hoc extending the `request` and `response` objects? (https://stackoverflow.com/questions/70034891/extending-http-incomingmessage-and-http-serverresponse-providing-it-to-the-htt)
  - Route based on other aspects of request, for example, `search`?
- Request Parsing
  - In the case of a request with a file that is too big, the server may not stop writing the file to the filesystem early enough, abusing the server resources (for example, disk).
  - Pass `pathname` parameters through `decodeURIComponent`?
  - Different charsets?
  - `Content-Encoding` (for example, compression)?
- Response Helpers
  - Do we really don’t have to worry about `Content-Length`?
    - Node.js already sets `Content-Length` if you use `end()`. If you use `write()` Node.js sets chunked transfer.
    - If necessary we could use `Buffer.byteLength()` to determine the `Content-Length`
- Live Connection
  - Don’t traverse the set of connections: Index by `request.id` and by `request.URL.pathname` (with hierarchical indexing, similar to proposal for `utilities.intern`)
  - Currently a Live Connection update sends a whole new page to the browser, even if only a small occurred. To solve this, we could have the server hold on to the latest rendering, diff on the server instead of the browser, and send a transcript of what the browser needs to do to to morph the page. This is what Phoenix LiveView does.
- Image/Video/Audio Proxy
  - Edge cases
    - Test destinations like `localhost`, `127.0.0.1`, and so forth
    - Test redirect loop
    - Test timeout
    - Limit size?
  - Range requests?
  - Resize images?
  - Cache? Not only for performance, but also because third-party images may go away
  - Include HMAC?
    - Perhaps not, because as far as I understand the purpose of HMAC is to prevent abuse, but hotlinked images can only be used from our website anyway due to Cross-Origin-Resource-Policy. In other words, you can’t hotlink a hotlinked (proxied) image. This saves us from having to compute & verify HMACs.
- CSRF Protection
  - Currently we’re defending from CSRF by requiring a custom header. This is the simplest protection mechanism, but it’s vulnerable to broken environments that let cross-site requests include custom headers (for example, old versions of Flash).
  - [Synchronizer tokens](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern) are the most secure option.
    - Communicate the token to the server with the custom header (`CSRF-Protection`), combining the synchronizer token with the custom header approach.
    - Let the synchronizer tokens be session-wide, not specific per page, so as to not break the browser “Back” button.
    - Couple the synchronizer token to the user session.
    - Have pre-sessions with synchronizer tokens for signed out users to protect against login CSRF.
  - In case the implementation of the synchronizer token doesn’t go well, try to use the [double-submit pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#alternative-using-a-double-submit-cookie-pattern).
    - It requires a secret known by the server to implement most securely. Note how everything boils down to the server recognizing itself by seeing a secret piece of data that it created.
- Cache the rendering of the HTML
  - https://guides.rubyonrails.org/caching_with_rails.html
  - Storage:
    - In memory of the Node.js process (separate caches per process / cache is flushed between restarts)
    - In SQLite database (shared cache among processes / cache is persisted between restarts)

## `@radically-straightforward/sqlite`

- `database.backgroundJob` may not need to sleep for 200ms between jobs.
- Reasons to continue using `better-sqlite3` instead of `node:sqlite` for now:
  - We don’t know which compile-time flags they’re using.
  - Transactions.
  - `PRAGMA`s.
  - `iterate()`.

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

- Live Navigation
  - Cache server responses to show a preview while fetching a page.
    - Advantages:
      - It’ll potentially be a bit faster.
    - Disadvantages:
      - It complicates the implementation.
      - It uses more memory on the client side.
    - Make sure to clear cache on sign-out or the back button will reveal private information.
  - Pre-fetching
    - There are some links that have side-effects, for example, changing the most recently visited course and conversation
    - Potential workaround: Have some flag that the request is a pre-fetching (say, an HTTP header) and don’t perform these side-effects
    - All links in viewport
      - https://getquick.link/
    - Link under cursor
      - https://www.peterbe.com/plog/aggressively-prefetching-everything-you-might-click
      - https://www.mskog.com/posts/instant-page-loads-with-turbolinks-and-prefetch
      - http://instantclick.io
    - Predictive prefetching: https://www.tensorflow.org/js/tutorials/applications/predictive_prefetching
    - References:
      - https://web.dev/speculative-prerendering/
  - The submission of a form resets the state of the rest of the page.
    - For example, start editing the title of a conversation, then click on “Pin”. The editing form will go away.
    - For example, when you’re filling in the “Start a New Conversation” form, and you do a search on the sidebar.
- Live Connection
  - Partials could have their own Live Connection lifecycle

## `@radically-straightforward/utilities`

## `@radically-straightforward/node`

- Application startup (process management)
  - Tunnel
    - Start Caddy with `address` `http://localhost`, then create a port forwarding in Visual Studio Code to port 80, public.
  - Profiling
  - Children processes could tell main process that they’re ready, this way we could do things like, for example, only start Caddy when the `web` processes are ready to receive requests. This is what worker threads & clusters call being `online`. If we do that, then we can enable Caddy’s active health checks.
  - If a child process crashes too many times in a short period, then crash the main process.
- Performance monitoring
  - Requests that are slow to answer
  - Background jobs queue that grows too long
  - Process crashes

## `@radically-straightforward/typescript`

## `@radically-straightforward/documentation`

## `@radically-straightforward/caddy`

- There’s an issue when running for the first time: Caddy may ask for your password, but you may not see it.
  - It still works if you see it and type in the password, even as other stuff has scrolled by.
  - Potential solutions:
    - If Caddy configuration directory doesn’t exist, run Caddy on the foreground
    - Run Caddy before spawning other children processes (but how do you know that Caddy is done?)
    - Document this quirk.
- Rate limiting
  - https://github.com/mholt/caddy-ratelimit
  - https://github.com/RussellLuo/caddy-ext/tree/master/ratelimit

## `@radically-straightforward/build`

## `@radically-straightforward/package`

## `@radically-straightforward/production`

## `@radically-straightforward/development`

## Other

- `unref` the `setTimeout`s.
- Better text editor support for tagged templates with 100% functional syntax highlighting and IntelliSense.

## Marketing

- Logo
- Dedicated website
- Conference talks
- Videos
- Podcasts
