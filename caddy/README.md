# Radically Straightforward · Caddy

**☁️ Install [Caddy](https://caddyserver.com/) as an npm package**

## Installation

```console
$ npm install @radically-straightforward/caddy
```

> **Note:** For quick-and-easy testing you may run Caddy from the command line with `npx` instead of installing it explicitly:
>
> ```console
> $ npx @radically-straightforward/caddy
> ```

> **Note:** By default the latest version of Caddy is installed. You may specify a version in `package.json` with a `caddy` property, for example:
>
> `package.json`
>
> ```json
> {
>   "caddy": "2.7.5"
> }
> ```

## Usage

```console
$ npx caddy
```

> **Note:** If the command above doesn’t work, which may happen in particular on Windows, use the path to the binary instead of `npx`:
>
> ```console
> > .\node_modules\.bin\caddy
> ```

---

Besides the Caddy binary, `@radically-straightforward/caddy` also comes with helpers to define a [Caddyfile](https://caddyserver.com/docs/quick-starts/caddyfile).

```typescript
import childProcess from "node:child_process";
import caddyfile from "@radically-straightforward/caddy";
import * as caddy from "@radically-straightforward/caddy";

const caddyServer = childProcess.spawn(
  "./node_modules/.bin/caddy",
  ["run", "--adapter", "caddyfile", "--config", "-"],
  { stdio: [undefined, "inherit", "inherit"] },
);
caddyServer.stdin.end(caddy.application());
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `start()`

```typescript
export function start({
  extraCaddyfile = caddyfile``,
  ...applicationOptions
}: {
  extraCaddyfile?: Caddyfile;
} & Parameters<typeof application>[0] = {}): void;
```

Start a Caddy process with `application()` configuration. If the process crashes, a new one is spawned.

### `staticFiles`

```typescript
export const staticFiles: {
  [key: string]: string;
};
```

A mapping from static file names to their hashed names, as produced by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) and found in `./build/static.json`.

### `application()`

```typescript
export function application({
  address = "localhost",
  trustedStaticFilesRoots = [
    `* "${path.join(url.fileURLToPath(new URL("..", import.meta.url)).split("/node_modules/")[0], "build/static/")}"`,
  ],
  untrustedStaticFilesRoots = [
    `/files/* "${path.join(process.cwd(), "data")}"`,
  ],
  dynamicServerPorts = [18000],
  email = undefined,
  hstsPreload = false,
}: {
  address?: string;
  trustedStaticFilesRoots?: string[];
  untrustedStaticFilesRoots?: string[];
  dynamicServerPorts?: number[];
  email?: string;
  hstsPreload?: boolean;
} = {}): Caddyfile;
```

A Caddyfile template for an application.

**Parameters**

- **`address`:** The [`address` of the site block](https://caddyserver.com/docs/caddyfile/concepts#addresses). Usually the `address` is the [`hostname`](https://nodejs.org/api/url.html#url-strings-and-url-objects) part of the application’s URL, for example, `example.com` (notably, the `hostname` doesn’t include neither the protocol nor the port).

- **`trustedStaticFilesRoots`:** [Caddy `root` directives](https://caddyserver.com/docs/caddyfile/directives/root) for static files that are **trusted** by the application, for example, the application’s CSS and browser JavaScript.

- **`untrustedStaticFilesRoots`:** Similar to `trustedStaticFilesRoots`, but for static files that are **untrusted** by the application, for example, user-uploaded avatars, attachments to messages, and so forth.

  > **Note:** Both `trustedStaticFilesRoots` and `untrustedStaticFilesRoots` must refer to **immutable** files. You may use [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) to build CSS, browser JavaScript, and other static files with immutable and unique file names. Your application should create immutable and unique file names for user-uploaded avatars, attachments to messages, and so forth.

- **`dynamicServerPorts`:** Ports for the dynamic part of the application—usually several processes of a Node.js server.

- **`email`:** The email of the system administrator, which is used by certificate authorities to contact about certificates. If `undefined`, then the server is run in development mode with local self-signed certificates.

- **`hstsPreload`:** Whether the `Strict-Transport-Security` header should include the [`preload` directive](https://hstspreload.org/). This is `false` by default, but we recommended that in production you opt into preloading by setting `hstsPreload` to `true`.

**Features**

- Turn off [Caddy’s administrative API endpoint](https://caddyserver.com/docs/api). This keeps things simple, at the cost of requiring an application restart to change Caddy’s configurations.

- Set the system administrator email, which is used by certificate authorities to contact about certificates.

- Set the following security headers:

  - **`Strict-Transport-Security`:** Tells the browser that moving forward it should only attempt to load this origin with HTTPS (not HTTP). The `hstsPreload` parameter controls whether to set the [`preload` directive](https://hstspreload.org/)—by default it’s `false`, but it’s recommended that you opt into preloading by setting `hstsPreload: true`.

  - **`Cache-Control`:** Turns off HTTP caching. This is the best setting for the dynamic parts of the application: in the best case the cache may be stale, and in the worst case the cache may include private information that could leak even after signing out. For static files, we recommend that you overwrite this header to enable caching, for example, `header Cache-Control "public, max-age=31536000, immutable"`.

  - **`X-Content-Type-Options`:** Turns off `Content-Type` sniffing, because: 1. The application may break if content sniffing goes wrong; and 2. Content sniffing needs access to the response body but the response body may take long to arrive in streaming responses. Make sure to set the `Content-Type` header appropriately.

  - **`X-XSS-Protection`:** Disables XSS filtering because, ironically, [XSS filtering may make the application vulnerable](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection#vulnerabilities_caused_by_xss_filtering).

  - **`Permissions-Policy`:** Opts out of [FLoC](https://web.dev/articles/floc).

  - **`Origin-Agent-Cluster`:** Tells the browser to try and isolate the process running the application.

  - **`Content-Security-Policy`:** Allows the application to retrieve content only from the same origin. Inline styles are allowed. Frames and objects are disabled. Forms may only be submitted to the same origin. If you need to serve images/videos/audios from third-party websites (for example, as part of content generated by users), setup a [proxy](https://github.com/radically-straightforward/radically-straightforward/tree/main/server) (it also solves the potential issue of [mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)).

  - **`Cross-Origin-*-Policy`:** Allow only the same origin to load content from the application. This is the converse of the `Content-Security-Policy` header. For files that you wish to allow embedding in other origins, set `header Cross-Origin-Resource-Policy cross-origin`.

  - **`X-Frame-Options`:** Disallows the application from being embedded in a frame.

  - **`X-Permitted-Cross-Domain-Policies`:** Disallows the application from being embedded in a PDF, a Flash document, and so forth.

  - **`X-DNS-Prefetch-Control`:** Disables DNS prefetching, because DNS prefetching could leak information about the application to potentially untrusted DNS servers.

  - **`Referrer-Policy`:** Tells the browser to not send the `Referer` request header. This makes the application more secure because external links don’t leak information about the URL that the user was on.

- Configure a server for trusted and untrusted static files. Safe untrusted file types are allowed to be embedded in other origins, and unsafe untrusted file types are forced to be downloaded, which prevents user-generated JavaScript from running within the context of the application ([XSS](https://owasp.org/www-community/attacks/xss/)).

- Configure a reverse proxy with load balancing to the dynamic part of the application. The load balancing policy is set to [`cookie`](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#lb_policy), which uses the `lb` cookie to setup sticky sessions and allows the server to hold state (for example, [`@radically-straightforward/server`’s Live Connections](https://github.com/radically-straightforward/radically-straightforward/tree/main/server#live-connection)).

**References**

- <https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP> and other articles under **HTTP security**.
- <https://owasp.org/www-project-secure-headers/>
- <https://helmetjs.github.io/>

### `Caddyfile`

```typescript
export type Caddyfile = string;
```

A type alias to make your type annotations more specific.

### `caddyfile()`

```typescript
export default function caddyfile(
  templateStrings: TemplateStringsArray,
  ...substitutions: Caddyfile[]
): Caddyfile;
```

A [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for [Caddyfile](https://caddyserver.com/docs/quick-starts/caddyfile).

<!-- DOCUMENTATION END: ./source/index.mts -->

## Related Work

### [`caddy-npm`](https://www.npmjs.com/package/caddy-npm)

Only supports specific versions of Caddy and requires an update to the package itself when a new version of Caddy is released. At the time of this writing (2023-11-14) the latest supported version is Caddy 2.1.1 from 2020-06-20 (more than three years old).

`@radically-straightforward/caddy`, on the other hand, supports new versions of Caddy as soon as they’re released.
