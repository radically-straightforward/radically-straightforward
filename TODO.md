# TODO

- `@radically-straightforward/all`
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
