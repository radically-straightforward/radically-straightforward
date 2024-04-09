# TODO

- In `@radically-straightforward/utilities`, extract a generic `backgroundJob()` that is independent of Node.js vs browser.
- In `@radically-straightforward/node`, introduce a `backgroundJob()` that’s aware of process termination.
- Update everywhere where `backgroundJob()` is used.
- Modify `@radically-straightforward/javascript` accordingly.
- Rename `@radically-straightforward/tsconfig` into `@radically-straightforward/typescript`.

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
