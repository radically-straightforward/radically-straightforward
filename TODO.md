# TODO

````typescript
/**
 * A background job system that builds upon `backgroundJob()` to provide the following features:
 *
 * - Allow jobs to be worked on by multiple Node.js processes.
 *
 * - Persist background jobs so that they are run even if the process crashes.
 *
 * - Impose a timeout on jobs.
 *
 * - Retry jobs that failed.
 *
 * - Schedule jobs to run in the future.
 *
 * - Log the progress of a job throughout the system.
 *
 * - Allow a job to be forced to run as soon as possible, even across processes. This is useful, for example, in a web application that sends emails in a background job (because sending emails would otherwise slow down the request-response cycle), but needs to send a “Password Reset” email as soon as possible. Inter-process communication is available through an HTTP server that listens on `localhost`.
 *
 * **References**
 *
 * - https://github.com/collectiveidea/delayed_job
 * - https://github.com/betterment/delayed
 * - https://github.com/bensheldon/good_job
 * - https://github.com/litements/litequeue
 * - https://github.com/diamondio/better-queue-sqlite
 */
export class BackgroundJobs {
  #database: Database;

  /**
   * - **`database`:** A [`@radically-straightforward/sqlite`](https://github.com/radically-straightforward/radically-straightforward/tree/main/sqlite) database that stores the background jobs. You may use the same database as your application data, which is simpler to manage, or a separate database for background jobs, which may be faster because background jobs write to the database often and SQLite locks the database on writes.
   *
   * - **`server`:** A [`@radically-straightforward/server`](https://github.com/radically-straightforward/radically-straightforward/tree/main/server) that, if provided, makes available endpoints that forces jobs to run as soon as possible. For example, a job of type `email` may be forced to run as soon as possible with the following request:
   *
   *   ```javascript
   *   await fetch("http://localhost:18000/email", {
   *     method: "POST",
   *     headers: { "CSRF-Protection": "true" },
   *   });
   *   ```
   */
  constructor(database: Database) {
    this.#database = database;
    this.#database.executeTransaction(() => {
      this.#database.execute(
        sql`
          CREATE TABLE IF NOT EXISTS "_backgroundJobs" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "type" TEXT NOT NULL,
            "startAt" TEXT NOT NULL,
            "startedAt" TEXT NULL,
            "retries" INTEGER NOT NULL,
            "parameters" TEXT NOT NULL
          ) STRICT;
          CREATE INDEX IF NOT EXISTS "_backgroundJobsType" ON "_backgroundJobs" ("type");
          CREATE INDEX IF NOT EXISTS "_backgroundJobsStartAt" ON "_backgroundJobs" ("startAt");
          CREATE INDEX IF NOT EXISTS "_backgroundJobsStartedAt" ON "_backgroundJobs" ("startedAt");
          CREATE INDEX IF NOT EXISTS "_backgroundJobsRetries" ON "_backgroundJobs" ("retries");
        `
      );
    });
  }

  /**
   * Add a job to be worked on.
   *
   * - **`startIn`:** Schedule a job to be run in the future.
   *
   * - **`parameters`:** Optional parameters that are serialized as JSON and then provided to the worker.
   */
  add({
    type,
    startIn = 0,
    parameters = null,
  }: {
    type: string;
    startIn?: number;
    parameters?: Parameters<typeof JSON.stringify>[0];
  }): void {
    const jobId = this.#database.run(
      sql`
        INSERT INTO "_backgroundJobs" (
          "type",
          "startAt",
          "retries",
          "parameters"
        )
        VALUES (
          ${type},
          ${new Date(Date.now() + startIn).toISOString()},
          ${0},
          ${JSON.stringify(parameters)}
        )
      `
    ).lastInsertRowid;
    utilities.log("BACKGROUND JOB", "ADD", type, String(jobId));
  }

  /**
   * Define a worker for a given `type` of job.
   *
   * - **`interval`:** How often the worker polls the database for new jobs. Don’t make this number too small—if you need a job to run without delay, use the web server to force a worker to execute as soon as possible.
   *
   * - **`timeout`:** How long a job may run for before it’s considered timed out. There are two kinds of timeouts:
   *
   *   - **Internal Timeout:** The job was initiated and didn’t finish on time. Note that in this case the job may actually end up running to completion, despite being marked for retrying in the future. This is a consequence of using [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `timeout()`.
   *
   *   - **External Timeout:** A job was found in the database with a starting date that is too old. This may happen because a process crashed while working on the job without the opportunity to clean things up.
   *
   * - **`retryIn`:** How long to wait for before retrying a job that threw an exception.
   *
   * - **`retries`:** How many times to retry a job before considering it failed.
   */
  worker<Type>(
    {
      type,
      timeout = 10 * 60 * 1000,
      retryIn = 5 * 60 * 1000,
      retries = 10,
    }: {
      type: string;
      timeout?: number;
      retryIn?: number;
      retries?: number;
    },
    job: (parameters: Type) => void | Promise<void>
  ): ReturnType<typeof backgroundJob> {
    return backgroundJob({ interval: 5000 }, async () => {
      this.#database.executeTransaction(() => {
        for (const backgroundJob of this.#database.all<{
          id: number;
          retries: number;
          parameters: string;
        }>(
          sql`
            SELECT "id", "retries", "parameters"
            FROM "_backgroundJobs"
            WHERE
              "type" = ${type} AND
              "startedAt" IS NOT NULL AND
              "startedAt" < ${new Date(Date.now() - timeout).toISOString()}
          `
        )) {
          utilities.log(
            "BACKGROUND JOB",
            "EXTERNAL TIMEOUT",
            type,
            String(backgroundJob.id),
            backgroundJob.retries === 0 ? backgroundJob.parameters : ""
          );
          this.#database.run(
            sql`
              UPDATE "_backgroundJobs"
              SET
                "startAt" = ${new Date(Date.now()).toISOString()},
                "startedAt" = NULL,
                "retries" = ${backgroundJob.retries + 1}
              WHERE "id" = ${backgroundJob.id}
            `
          );
        }
      });
      this.#database.executeTransaction(() => {
        for (const backgroundJob of this.#database.all<{
          id: number;
        }>(
          sql`
            SELECT "id"
            FROM "_backgroundJobs"
            WHERE
              "type" = ${type} AND
              ${retries} <= "retries"
          `
        )) {
          utilities.log(
            "BACKGROUND JOB",
            "FAIL",
            type,
            String(backgroundJob.id)
          );
          this.#database.run(
            sql`
              DELETE FROM "_backgroundJobs" WHERE "id" = ${backgroundJob.id}
            `
          );
        }
      });
      while (true) {
        const backgroundJob = this.#database.executeTransaction<
          { id: number; retries: number; parameters: string } | undefined
        >(() => {
          const backgroundJob = this.#database.get<{
            id: number;
            retries: number;
            parameters: string;
          }>(
            sql`
              SELECT "id", "retries", "parameters"
              FROM "_backgroundJobs"
              WHERE
                "type" = ${type} AND
                "startAt" <= ${new Date().toISOString()} AND
                "startedAt" IS NULL AND
                "retries" < ${retries}
              ORDER BY "id" ASC
              LIMIT 1
            `
          );
          if (backgroundJob === undefined) return undefined;
          this.#database.run(
            sql`
              UPDATE "_backgroundJobs"
              SET "startedAt" = ${new Date().toISOString()}
              WHERE "id" = ${backgroundJob.id}
            `
          );
          return backgroundJob;
        });
        if (backgroundJob === undefined) break;
        const start = process.hrtime.bigint();
        try {
          utilities.log(
            "BACKGROUND JOB",
            "START",
            type,
            String(backgroundJob.id)
          );
          await utilities.timeout(timeout, async () => {
            await job(JSON.parse(backgroundJob.parameters));
          });
          this.#database.run(
            sql`
              DELETE FROM "_backgroundJobs" WHERE "id" = ${backgroundJob.id}
            `
          );
          utilities.log(
            "BACKGROUND JOB",
            "SUCCESS",
            type,
            String(backgroundJob.id),
            `${(process.hrtime.bigint() - start) / 1_000_000n}ms`
          );
        } catch (error) {
          utilities.log(
            "BACKGROUND JOB",
            "ERROR",
            type,
            String(backgroundJob.id),
            `${(process.hrtime.bigint() - start) / 1_000_000n}ms`,
            backgroundJob.retries === 0 ? backgroundJob.parameters : "",
            String(error),
            (error as Error)?.stack ?? ""
          );
          this.#database.run(
            sql`
              UPDATE "_backgroundJobs"
              SET
                "startAt" = ${new Date(Date.now() + retryIn).toISOString()},
                "startedAt" = NULL,
                "retries" = ${backgroundJob.retries + 1}
              WHERE "id" = ${backgroundJob.id}
            `
          );
        }
        await timers.setTimeout(200);
      }
    });
  }
}

test(
  "BackgroundJobs",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "BackgroundJobs"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "BackgroundJobs"’.`,
  },
  async () => {
    const database = await new Database(":memory:").migrate();
    const backgroundJobs = new node.BackgroundJobs(database, server());

    backgroundJobs.add({ type: "a-job-with-no-worker" });

    database.run(
      sql`
        INSERT INTO "_backgroundJobs" (
          "type",
          "startAt",
          "startedAt",
          "retries",
          "parameters"
        )
        VALUES (
          ${"a-job-which-was-left-behind"},
          ${new Date(Date.now() - 20 * 60 * 1000).toISOString()},
          ${new Date(Date.now() - 15 * 60 * 1000).toISOString()},
          ${0},
          ${JSON.stringify(null)}
        )
      `
    );
    backgroundJobs.worker(
      {
        type: "a-job-which-was-left-behind",
      },
      () => {}
    );

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    backgroundJobs.worker(
      {
        type: "a-job-which-times-out",
        timeout: 1000,
        retryIn: 1000,
        retries: 2,
      },
      async () => {
        await timers.setTimeout(5000);
      }
    );
    backgroundJobs.add({
      type: "a-job-which-times-out",
      parameters: { name: "Leandro" },
    });

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    backgroundJobs.worker(
      {
        type: "a-job-which-throws-an-exception",
        timeout: 1000,
        retryIn: 1000,
        retries: 2,
      },
      async () => {
        throw new Error("AN ERROR");
      }
    );
    backgroundJobs.add({
      type: "a-job-which-throws-an-exception",
      parameters: { name: "Leandro" },
    });

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    backgroundJobs.worker(
      { type: "a-job-which-is-forced-into-execution" },
      () => {}
    );
    backgroundJobs.add({
      type: "a-job-which-is-forced-into-execution",
      parameters: { name: "Leandro" },
    });

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    await fetch("http://localhost:18000/a-job-which-is-forced-into-execution", {
      method: "POST",
      headers: { "CSRF-Protection": "true" },
    });

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    if (process.platform === "win32") process.exit();
    else process.kill(process.pid);
  }
);
````

---

- Should `server` do inter-process communication via a database, similar to background jobs?

## Introduction

- Example application
- Principles
  - Colocation (Tailwind, https://vuejs.org/guide/scaling-up/sfc.html, and so forth)
  - Stay as close to the platform as possible (for example, avoid virtual DOM)
  - Avoid Domain-Specific Languages (DSL) (for example, avoid CSS-in-JavaScript by the means of JavaScript objects) (use tagged templates instead)
  - Avoid distributed applications (a frontend that’s a separate application communicating through an API is a distributed application)
  - Avoid external processes (for example, Redis)
  - Avoid multiple source files
  - Resist the urge to abstract early, because may have the wrong abstraction, and a wrong abstraction is a bigger issue than no abstraction (repetition is okay, DRY isn’t always the way)
  - Spaghetti code vs soup of difficult-to-trace objects (https://www.youtube.com/watch?v=QM1iUe6IofM)
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
  - https://www.liveviewjs.com/
  - https://hypermedia.systems/
  - https://news.ycombinator.com/item?id=38241304
  - https://htmx.org/essays/right-click-view-source/
  - https://htmx.org/essays/locality-of-behaviour/

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
  9.  States (for example, `:hover`).
  10. Variations (for example, breakpoints and dark mode).
  11. Children, including `::before` and `::after`.
- Don’t use the same set of breakpoints all the time. Analyze case by case, and set breakpoints accordingly. (And besides, CSS variables don’t work for setting breakpoints, because they’re defined in `:root`, and the media query lives outside the scope of a selector.)
- Layers (not in the `@layer` sense)
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

# Setting Up for Development

**Welcome!** 👋

Courselore has been designed to be welcoming to new developers. It’s an excellent first project for people who are new to contributing to open-source software.

> **Note:** If you get stuck, please [open an issue](https://github.com/courselore/courselore/issues/new?body=%2A%2AWhat%20did%20you%20try%20to%20do%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20did%20you%20expect%20to%20happen%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20really%20happened%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20error%20messages%20%28if%20any%29%20did%20you%20run%20into%3F%2A%2A%0A%0A%0A%0A%2A%2APlease%20provide%20as%20much%20relevant%20context%20as%20possible%20%28operating%20system%2C%20browser%2C%20and%20so%20forth%29%3A%2A%2A%0A).

> **Note:** Join our community at [Meta Courselore](https://courselore.org/courses/8537410611/invitations/3667859788) to talk to the developers, propose pull requests, get help on what you’re developing, and so forth.

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

## Running from Source

<details>
<summary>Windows</summary>

> **Note:** If you’re using the Windows Subsystem for Linux (WSL), follow the instructions for Linux instead.

1. Install [Chocolatey](https://chocolatey.org) and the following packages:

   ```console
   > choco install nodejs python visualstudio2022-workload-vctools vscode git
   ```

   > **Note:** You must run PowerShell as administrator for Chocolatey to work.

   > **Note:** You may have to close and reopen PowerShell after installing programs such as Chocolatey.

   > **Note:** Instead of using Chocolatey, you could go to the websites for the development tools and install them by hand, but Chocolatey makes installation and updates more straightforward.

   > **Package Breakdown**
   >
   > - [Node.js (`nodejs`)](https://nodejs.org/): The program that runs the JavaScript on which most of Courselore is written.
   >
   > - [Python (`python`)](https://www.python.org) and [Visual Studio C++ Build Tools (`visualstudio2022-workload-vctools`)](https://visualstudio.microsoft.com/visual-cpp-build-tools/): These tools are necessary to build native Node.js extensions written in C/C++.
   >
   > - [Visual Studio Code (`vscode`)](https://code.visualstudio.com): A text editor with excellent support for the programming languages used in Courselore.
   >
   > - [Git (`git`)](https://git-scm.com): The version control system used by Courselore.

2. Setup Git:

   - [Username](https://docs.github.com/en/get-started/getting-started-with-git/setting-your-username-in-git#setting-your-git-username-for-every-repository-on-your-computer)
   - [Email](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-email-preferences/setting-your-commit-email-address#setting-your-email-address-for-every-repository-on-your-computer)
   - [Global `.gitignore` for files such as `.DS_Store` generated by Finder in macOS](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files#configuring-ignored-files-for-all-repositories-on-your-computer)
   - [SSH keys to connect to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

3. Install the following Visual Studio Code extensions:

   - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): Support for [Prettier](https://prettier.io), the code formatter used by Courselore.
   - [`es6-string-html`](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html): Syntax highlighting for HTML & SQL as tagged templates in TypeScript—a feature heavily used in the Courselore codebase.
   - [Indentation Level Movement](https://marketplace.visualstudio.com/items?itemName=kaiwood.indentation-level-movement): Move up & down by indentation, which helps navigating on HTML embedded in JavaScript in the style we use in Courselore.

4. Clone the codebase, install the dependencies, and run Courselore:

   ```console
   > git clone git@github.com:courselore/courselore.git
   > cd courselore/web/
   > npm install
   > npm start
   ```

</details>

<details>

<summary>macOS</summary>

1. Install [Homebrew](https://brew.sh) and the following packages:

   ```console
   $ brew install node visual-studio-code git
   ```

   > **Note:** Instead of using Homebrew, you could go to the websites for the development tools and install them by hand, but Homebrew makes installation and updates more straightforward.

   > **Package Breakdown**
   >
   > - [Node.js (`node`)](https://nodejs.org/): The program that runs the JavaScript on which most of Courselore is written.
   >
   > - [Visual Studio Code (`visual-studio-code`)](https://code.visualstudio.com): A text editor with excellent support for the programming languages used in Courselore.
   >
   > - [Git (`git`)](https://git-scm.com): The version control system used by Courselore.

2. Setup Git:

   - [Username](https://docs.github.com/en/get-started/getting-started-with-git/setting-your-username-in-git#setting-your-git-username-for-every-repository-on-your-computer)
   - [Email](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-email-preferences/setting-your-commit-email-address#setting-your-email-address-for-every-repository-on-your-computer)
   - [Global `.gitignore` for files such as `.DS_Store` generated by Finder in macOS](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files#configuring-ignored-files-for-all-repositories-on-your-computer)
   - [SSH keys to connect to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

3. Install the following Visual Studio Code extensions:

   - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): Support for [Prettier](https://prettier.io), the code formatter used by Courselore.
   - [`es6-string-html`](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html): Syntax highlighting for HTML & SQL as tagged templates in TypeScript—a feature heavily used in the Courselore codebase.
   - [Indentation Level Movement](https://marketplace.visualstudio.com/items?itemName=kaiwood.indentation-level-movement): Move up & down by indentation, which helps navigating on HTML.

4. Clone the codebase, install the dependencies, and run Courselore:

   ```console
   $ git clone git@github.com:courselore/courselore.git
   $ cd courselore/web/
   $ npm install
   $ npm start
   ```

   > **Note:** macOS imposes a limit on the number of files a process can open, but in development Courselore needs to open more files than the default setting allows because it reloads code as soon as you change it. Increase the limit by following [these instructions](https://gist.github.com/abernix/a7619b07b687bb97ab573b0dc30928a0).

</details>

<details>

<summary>Linux (<a href="https://ubuntu.com">Ubuntu</a>)</summary>

1. Install [Homebrew on Linux](https://docs.brew.sh/Homebrew-on-Linux) and the following packages:

   ```console
   $ brew install node git
   $ sudo snap install code --classic
   ```

   > **Note:** Instead of using Homebrew, you could go to the websites for the development tools and install them by hand, but Homebrew makes installation and updates more straightforward.

   > **Package Breakdown**
   >
   > - [Node.js (`node`)](https://nodejs.org/): The program that runs the JavaScript on which most of Courselore is written.
   >
   > - [Git (`git`)](https://git-scm.com): The version control system used by Courselore.
   >
   > - [Visual Studio Code (`code`)](https://code.visualstudio.com): A text editor with excellent support for the programming languages used in Courselore.

   > **Why Homebrew for Linux instead of `apt` (a package manager that comes with Ubuntu)?** The packages available from `apt` prioritize stability, so they run behind on the latest releases. This is desirable for long-running servers, but not for development.

   > **Why Homebrew for Linux instead of [Snap](https://snapcraft.io) (another package manager that comes with Ubuntu)?** Snaps use a constrained permissions system that [doesn’t work well with native Node.js extensions written in C/C++](https://github.com/nodejs/snap/issues/3). Note that Snaps are the best option for graphical applications such as Visual Studio Code, which aren’t available in Homebrew for Linux, so in the snippet above we installed Visual Studio Code from Snap.

2. Setup Git:

   - [Username](https://docs.github.com/en/get-started/getting-started-with-git/setting-your-username-in-git#setting-your-git-username-for-every-repository-on-your-computer)
   - [Email](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-email-preferences/setting-your-commit-email-address#setting-your-email-address-for-every-repository-on-your-computer)
   - [Global `.gitignore` for files such as `.DS_Store` generated by Finder in macOS](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files#configuring-ignored-files-for-all-repositories-on-your-computer)
   - [SSH keys to connect to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

3. Install the following Visual Studio Code extensions:

   - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): Support for [Prettier](https://prettier.io), the code formatter used by Courselore.
   - [`es6-string-html`](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html): Syntax highlighting for HTML & SQL as tagged templates in TypeScript—a feature heavily used in the Courselore codebase.
   - [Indentation Level Movement](https://marketplace.visualstudio.com/items?itemName=kaiwood.indentation-level-movement): Move up & down by indentation, which helps navigating on HTML.

4. Clone the codebase, install the dependencies, and run Courselore:

   ```console
   $ git clone git@github.com:courselore/courselore.git
   $ cd courselore/web/
   $ npm install
   $ npm start
   ```

</details>

## Sharing the Development Server

It’s often useful to run Courselore in your development machine and access it from another device. For example, you may access it from your phone to test user interface changes, or let someone in a video-chat access it from the internet to assist in investigating an issue.

To make this work, you must establish a network route between your development machine and the device that will access it. There are two ways of doing this:

**Local Area Network (LAN)**

Recommended for: Accessing Courselore from your phone to test user interface changes.

Advantages: Fastest. Works even when you don’t have an internet connection, as long as all the devices are connected to the same LAN/wifi.

Disadvantages: Doesn’t work on some LANs. Doesn’t work across the internet, so may not be used to share a server with someone over video-chat.

<details>
<summary>How to</summary>

1. Determine the LAN address of your development machine, which may be a name such as `leafac--mac-mini.local` or an IP address. The exact procedure depends on your operating system and network configuration.

   > **macOS Tip:** Go to **System Preferences… > Sharing** and take note of the name ending in `.local`.

2. Send the root TLS certificate created by [Caddy](https://caddyserver.com) to the other device.

   > **Example:** In macOS the default location of the certificate is `~/Library/Application Support/Caddy/pki/authorities/local/root.crt`. You may AirDrop that file to an iPhone/iPad.

   > **Note:** Certificates have a `.crt` extension. **Importantly, `.key` files are not certificates.** These `.key` files are signing keys which must never leave your development machine, because they would allow for other devices to intercept and tamper with your network traffic.

3. Install & trust the TLS certificate on the other device.

   > **Note:** The exact procedure depends on the operating system, but typically this process occurs in two steps: First **install** the certificate, then **trust** it.

   > **iPhone/iPad Tip:** Install the certificate on **Settings > General > VPN & Device Management Certificates**, and trust it on **Settings > General > About > Certificate Trust Settings**.

   > **Windows Tip:** Install the certificate under the Logical Store Name called **Trusted Root Certification Authorities > Certificates**.

4. Run Courselore with the `HOSTNAME` environment variable set to the address determined in step 1, for example, in macOS and Linux:

   ```console
   $ env HOSTNAME=leafac--mac-mini.local npm start
   ```

5. Visit the address on the other device.

</details>

**Tunnel**

Recommended for: Letting someone in a video-chat access Courselore from the internet to assist in investigating an issue.

Advantages: Works across the internet.

Disadvantages: Slower. Requires an internet connection.

<details>
<summary>How to</summary>

1. Create the tunnel. If you’re part of the Courselore team, you may request a custom Courselore tunnel address such as `leafac.courselore.org`, otherwise you may use services such as [Localtunnel](https://theboroer.github.io/localtunnel-www/) and [localhost.run](https://localhost.run), for example:

   ```console
   # Custom Courselore Tunnel Address
   $ ssh -NR 3000:localhost:80 root@leafac.courselore.org

   # Localtunnel
   $ npx localtunnel --port 80

   # localhost.run
   $ ssh -R 80:localhost:80 localhost.run
   ```

2. Run Courselore with the `TUNNEL` environment variable set to the address given in step 1, for example, in macOS and Linux:

   ```console
   # Custom Courselore Tunnel Address
   $ env TUNNEL=leafac.courselore.org npm run start

   # Localtunnel
   $ env TUNNEL=tough-feet-train-94-60-46-156.loca.lt npm run start

   # localhost.run
   $ env TUNNEL=089678d384a43b.lhr.life npm run start
   ```

3. Visit the address on the other device.

</details>

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

## `monitor`

## Other

- Better text editor support for tagged templates with 100% functional syntax highlighting and IntelliSense.

## Marketing

- Logo
- Dedicated website
- Conference talks
- Videos
- Podcasts
