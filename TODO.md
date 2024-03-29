# TODO

- package
  - Fix issue in Windows
    - Remove extra `console.log()`s
    - Bring back all tests
  - Release a new version
- caddy serving of `static/` files points to the wrong place
  - Does it help to change `package` such that `${path.basename(input)}--source` turns into `_` (a fixed name)?
```
url.fileURLToPath(new URL("./static/", import.meta.url))

url.fileURLToPath(new URL("../data/", import.meta.url))
OR
path.join(process.cwd(), "data")
```
- Return to `build`’s documentation

---

- Packages
  - build
  - Review other Courselore stuff
    - Documentation on setting up
    - Use SQLite as queue:
      - https://github.com/collectiveidea/delayed_job/tree/11e0212fb112c5e11e4555ef1e24510819a66347#gory-details
      - https://sqlite.org/forum/info/b047f5ef5b76edff
      - https://github.com/StratoKit/strato-db/blob/master/src/EventQueue.js
      - https://github.com/litements/litequeue
      - https://www.npmjs.com/package/better-queue-sqlite
      - https://github.com/bensheldon/good_job
      - https://github.com/betterment/delayed
    - Startup the application
      - Different children processes
      - Tunnel
        - Start Caddy with `address` `http://localhost`, then create a port forwarding in Visual Studio Code to port 80, public.
      - Profiling
      - Source maps
- Tasks
  - Archive project on computer
  - Resolve GitHub Issues & Pull Requests
  - Archive GitHub repository
  - Depreacte npm package
- Documentation
  - Logo
  - Ideology:
    - Spaghetti code vs soup of unknown objects
    - Why not JSX?
      - Because we don’t have embedded CSS and browser JavaScript either
      - Because it may be slower
      - Because it forces a compile step (though the CSS & browser JavaScript approach alread does that 🤷‍♂️) (but at least it’s closer to the underlying JavaScript language)
  - Dedicated website?
- Projects that need to be updated to use the new dependencies
  - courselore
    - `.toString(36)` → `utilities.randomString()`
    - Remove uses of `node:timers/promises`
    - Got → `fetch()`
    - prompts → readline
    - Retest session sliding because of the way we delete/reset cookies, which depends on respecting the order of the `Set-Cookie` headers
  - leafac.com
- New project boilerplate
  - `.gitattributes`
    - Remove `--end-of-line auto` from Prettier invocation
    - `* text=auto eol=lf`
    - `git add --renormalize .`
      - `manual.pdf	-text`
  - `LICENSE.md`
  - `CODE_OF_CONDUCT.md `
  - `CHANGELOG.md`
  - `FUNDING.yml`
  - `package.json`
  - `main.yml`
- Future
  - Better text editor support:
    - Syntax highlighting
    - IntelliSense
  - TypeScript on browser JavaScript
