import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import os from "node:os";
import * as node from "@radically-straightforward/node";

/**
 * Start a Caddy process with `application()` configuration. If the process crashes, a new one is spawned.
 */
export function start({
  extraCaddyfile = caddyfile``,
  ...applicationOptions
}: { extraCaddyfile?: Caddyfile } & Parameters<
  typeof application
>[0] = {}): void {
  node.childProcessKeepAlive(() => {
    const caddyChildProcess = childProcess.spawn(
      path.join(
        path.join(import.meta.dirname, "..").split("/node_modules/")[0],
        "node_modules/.bin/caddy",
      ),
      ["run", "--adapter", "caddyfile", "--config", "-"],
      { stdio: [undefined, "ignore", "ignore"] },
    );
    caddyChildProcess.stdin.end(
      application(applicationOptions) + extraCaddyfile,
    );
    return caddyChildProcess;
  });
}

/**
 * A mapping from static file names to their hashed names, as produced by [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) and found in `./build/static.json`.
 */
export const staticFiles: { [key: string]: string } = JSON.parse(
  await fs
    .readFile(
      path.join(
        import.meta.dirname.split("/node_modules/")[0],
        "build/static.json",
      ),
      "utf-8",
    )
    .catch(() => JSON.stringify({})),
);

/**
 * A Caddyfile template for an application.
 *
 * **Parameters**
 *
 * - **`hostname`:** The [`hostname`](https://nodejs.org/api/url.html#url-strings-and-url-objects) part of the application’s URL, for example, `example.com`.
 *
 * - **`systemAdministratorEmail`:** The email of the system administrator is used by certificate authorities to contact about certificates. If `undefined`, then the server is run in development mode with the `hostname` `localhost` and a local self-signed certificate.
 *
 * - **`hstsPreload`:** Whether the `Strict-Transport-Security` header should include the [`preload` directive](https://hstspreload.org/). This is `false` by default, but we recommended that in production you opt into preloading by setting `hstsPreload` to `true` and then submit your domain to the preload list.
 *
 * - **`ports`:** Ports for the dynamic part of the application to which Caddy reverse proxies—usually several processes of a Node.js server.
 *
 * - **`trustedStaticFilesRoots`:** [Caddy `root` directives](https://caddyserver.com/docs/caddyfile/directives/root) for static files that are **trusted** by the application, for example, the application’s CSS and browser JavaScript.
 *
 * - **`untrustedStaticFilesRoots`:** Similar to `trustedStaticFilesRoots`, but for static files that are **untrusted** by the application, for example, user-uploaded avatars, attachments to messages, and so forth.
 *
 *   > **Note:** Both `trustedStaticFilesRoots` and `untrustedStaticFilesRoots` must refer to **immutable** files. You may use [`@radically-straightforward/build`](https://github.com/radically-straightforward/radically-straightforward/tree/main/build) to build CSS, browser JavaScript, and other static files with immutable and unique file names. Your application should create immutable and unique file names for user-uploaded avatars, attachments to messages, and so forth.
 *
 * - **`extraGlobalOptions`:** Extra [Caddyfile global options](https://caddyserver.com/docs/caddyfile/options). Useful, for example, to set HTTP ports other than the default.
 *
 * **Features**
 *
 * - Turn off [Caddy’s administrative API endpoint](https://caddyserver.com/docs/api). This keeps things simple, at the cost of requiring an application restart to change Caddy’s configurations.
 *
 * - Set the system administrator email, which is used by certificate authorities to contact about certificates.
 *
 * - Set the following security headers:
 *
 *   > **Note:** These headers may be overwritten by the underlying application. This is useful if the application needs to tweak some security settings, for example, Content Security Policy (CSP).
 *   - **`Strict-Transport-Security`:** Tells the browser that moving forward it should only attempt to load this origin with HTTPS (not HTTP). The `hstsPreload` parameter controls whether to set the [`preload` directive](https://hstspreload.org/)—by default it’s `false`, but it’s recommended that you opt into preloading by setting `hstsPreload: true`.
 *
 *   - **`Cache-Control`:** Turns off HTTP caching. This is the best setting for the dynamic parts of the application: in the best case the cache may be stale, and in the worst case the cache may include private information that could leak even after signing out. For static files, we recommend that you overwrite this header to enable caching, for example, `header Cache-Control "public, max-age=31536000, immutable"`.
 *
 *   - **`X-Content-Type-Options`:** Turns off `Content-Type` sniffing, because: 1. The application may break if content sniffing goes wrong; and 2. Content sniffing needs access to the response body but the response body may take long to arrive in streaming responses. Make sure to set the `Content-Type` header appropriately.
 *
 *   - **`X-XSS-Protection`:** Disables XSS filtering because, ironically, [XSS filtering may make the application vulnerable](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection#vulnerabilities_caused_by_xss_filtering).
 *
 *   - **`Permissions-Policy`:** Opts out of [FLoC](https://web.dev/articles/floc).
 *
 *   - **`Origin-Agent-Cluster`:** Tells the browser to try and isolate the process running the application.
 *
 *   - **`Content-Security-Policy`:** Allows the application to retrieve content only from the same origin. Inline styles are allowed. Frames and objects are disabled. Forms may only be submitted to the same origin. If you need to serve images/videos/audios from third-party websites (for example, as part of content generated by users), setup a [proxy](https://github.com/radically-straightforward/radically-straightforward/tree/main/server) (it also solves the potential issue of [mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)).
 *
 *   - **`Cross-Origin-*-Policy`:** Allow only the same origin to load content from the application. This is the converse of the `Content-Security-Policy` header. For files that you wish to allow embedding in other origins, set `header Cross-Origin-Resource-Policy cross-origin`.
 *
 *   - **`X-Frame-Options`:** Disallows the application from being embedded in a frame.
 *
 *   - **`X-Permitted-Cross-Domain-Policies`:** Disallows the application from being embedded in a PDF, a Flash document, and so forth.
 *
 *   - **`X-DNS-Prefetch-Control`:** Disables DNS prefetching, because DNS prefetching could leak information about the application to potentially untrusted DNS servers.
 *
 *   - **`Referrer-Policy`:** Tells the browser to not send the `Referer` request header. This makes the application more secure because external links don’t leak information about the URL that the user was on.
 *
 * - Configure a server for trusted and untrusted static files. Safe untrusted file types are allowed to be embedded in other origins, and unsafe untrusted file types are forced to be downloaded, which prevents user-generated JavaScript from running within the context of the application ([XSS](https://owasp.org/www-community/attacks/xss/)).
 *
 * - Configure a reverse proxy with load balancing to the dynamic part of the application. The load balancing policy is set to [`cookie`](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#lb_policy), which uses the `lb` cookie to setup sticky sessions and allows the server to hold state (for example, [`@radically-straightforward/server`’s Live Connections](https://github.com/radically-straightforward/radically-straightforward/tree/main/server#live-connection)).
 *
 * **References**
 *
 * - <https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP> and other articles under **HTTP security**.
 * - <https://owasp.org/www-project-secure-headers/>
 * - <https://helmetjs.github.io/>
 */
export function application({
  hostname = "localhost",
  systemAdministratorEmail = undefined,
  hstsPreload = false,
  ports = [18000],
  trustedStaticFilesRoots = [
    `* "${path.join(
      path.join(import.meta.dirname, "..").split("/node_modules/")[0],
      "build/static/",
    )}"`,
  ],
  untrustedStaticFilesRoots = [],
  extraGlobalOptions = caddyfile``,
}: {
  hostname?: string;
  systemAdministratorEmail?: string;
  hstsPreload?: boolean;
  ports?: number[];
  trustedStaticFilesRoots?: string[];
  untrustedStaticFilesRoots?: string[];
  extraGlobalOptions?: Caddyfile;
} = {}): Caddyfile {
  return caddyfile`
    {
      admin off
      ${systemAdministratorEmail !== undefined ? `email ${systemAdministratorEmail}` : `local_certs`}
      ${extraGlobalOptions}
    }

    ${systemAdministratorEmail !== undefined ? hostname : `localhost`} {
      encode

      header ?Strict-Transport-Security "max-age=31536000; includeSubDomains${
        hstsPreload ? `; preload` : ``
      }"
      header ?Cache-Control no-store
      header ?X-Content-Type-Options nosniff
      header ?X-XSS-Protection 0
      header ?Permissions-Policy "interest-cohort=()"
      header ?Origin-Agent-Cluster "?1"
      header ?Content-Security-Policy "default-src 'none'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
      header ?Cross-Origin-Resource-Policy same-origin
      header ?Cross-Origin-Embedder-Policy require-corp
      header ?Cross-Origin-Opener-Policy same-origin
      header ?X-Frame-Options DENY
      header ?X-Permitted-Cross-Domain-Policies none
      header ?X-DNS-Prefetch-Control off
      header ?Referrer-Policy no-referrer

      route {
        ${trustedStaticFilesRoots
          .map(
            (trustedStaticFilesRoot) => caddyfile`
              route {
                root ${trustedStaticFilesRoot}
                @file_exists file
                route @file_exists {
                  header Cache-Control "public, max-age=31536000, immutable"
                  file_server
                }
              }
            `,
          )
          .join("\n\n")}

        ${untrustedStaticFilesRoots
          .map(
            (untrustedStaticFilesRoot) => caddyfile`
              route {
                root ${untrustedStaticFilesRoot}
                @file_exists file
                route @file_exists {
                  header Cache-Control "private, max-age=31536000, immutable"
                  @safe path *.webp *.webm *.png *.jpg *.jpeg *.gif *.mp3 *.wav *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf *.txt
                  @not_safe not path *.webp *.webm *.png *.jpg *.jpeg *.gif *.mp3 *.wav *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf *.txt
                  header @safe Cross-Origin-Resource-Policy cross-origin
                  header @not_safe Content-Disposition attachment
                  file_server
                }
              }
            `,
          )
          .join("\n\n")}

        reverse_proxy ${ports
          .map((port) => `http://localhost:${port}`)
          .join(" ")} {
            lb_policy cookie
            ${systemAdministratorEmail === undefined ? `trusted_proxies private_ranges` : ``}
          }
      }
    }
  `;
}

/**
 * A type alias to make your type annotations more specific.
 */
export type Caddyfile = string;

/**
 * A [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for [Caddyfile](https://caddyserver.com/docs/quick-starts/caddyfile).
 */
export default function caddyfile(
  templateStrings: TemplateStringsArray,
  ...substitutions: Caddyfile[]
): Caddyfile {
  let output = "";
  for (const index of substitutions.keys()) {
    const templateString = templateStrings[index];
    output += templateString;
    const substitution = substitutions[index];
    output += substitution;
  }
  output += templateStrings.at(-1);
  return output;
}

/**
 * A best-effort to get the path to the [data directory in which Caddy stores TLS certificates](https://caddyserver.com/docs/conventions#data-directory).
 */
export function dataDirectory(): string {
  return process.platform === "win32"
    ? path.join(process.env.AppData ?? os.homedir(), "Caddy")
    : process.platform === "darwin"
      ? path.join(os.homedir(), "Library/Application Support/Caddy")
      : path.join(os.homedir(), ".local/share/caddy");
}
