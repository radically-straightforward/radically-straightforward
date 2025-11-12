import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import stream from "node:stream/promises";
import timers from "node:timers/promises";
import busboy from "busboy";
import "@radically-straightforward/node";
import * as node from "@radically-straightforward/node";
import * as utilities from "@radically-straightforward/utilities";

/**
 * A `Server` is an auxiliary type for convenience.
 */
export type Server = ReturnType<typeof server>;

/**
 * A `Route` is a combination of some conditions that the request must satisfy for the `handler` to be called, and the `handler` that produces a response. An application is an Array of `Route`s.
 *
 * - **`method`:** The HTTP request method, for example `"GET"` or `/^PATCH|PUT$/`.
 *
 * - **`pathname`:** The [`pathname`](https://nodejs.org/api/url.html#url-strings-and-url-objects) part of the HTTP request. [Named capturing groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Groups_and_backreferences) are available in the `handler` under `request.pathname`, for example, given `pathname: new RegExp("^/conversations/(?<conversationPublicId>[0-9]+)$")`, the `conversationPublicId` is available at `request.pathname.conversationPublicId`.
 *
 * - **`error`:** Indicates that this `handler` should only be called if a previous `handler` threw an exception.
 *
 * - **`handler`:** The function that produces the response. It’s similar to a function that you’d provide to [`http.createServer()`](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) as a `requestListener`, with two differences: 1. The `handler` is called only if the request satisfies the conditions above; and 2. The `request` and `response` parameters are extended with extra functionality (see `Request` and `Response`). The `handler` may be synchronous or asynchronous.
 */
export type Route = {
  method?: string | RegExp;
  pathname?: string | RegExp;
  error?: boolean;
  handler: (
    request: Request<{}, {}, {}, {}, {}>,
    response: Response,
  ) => void | Promise<void>;
};

/**
 * An extension of [Node.js’s `http.IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage) with the following extra functionality:
 *
 * - **`id`:** A unique request identifier.
 *
 * - **`start`:** A timestamp of when the request arrived.
 *
 * - **`log`:** A logging function which includes information about the request and formats the message with [`@radically-straightforward/utilities`’s `log()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities#log).
 *
 * - **`ip`:** The IP address of the request originator as reported by [Caddy](https://github.com/radically-straightforward/radically-straightforward/tree/main/caddy) (the reverse proxy) (uses the `X-Forwarded-For` HTTP request header).
 *
 * - **`URL`:** The [`request.url`](https://nodejs.org/api/http.html#messageurl) parsed into a [`URL` object](https://developer.mozilla.org/en-US/docs/Web/API/URL), including the appropriate protocol (uses the `X-Forwarded-Proto` HTTP request header) and host (uses the `X-Forwarded-Host` or the `Host` HTTP request header) as reported by Caddy.
 *
 * - **`pathname`:** The variable parts of the [`pathname` part of the `URL`](https://nodejs.org/api/url.html#url-strings-and-url-objects), as defined in the named capturing groups of the regular expression from the `route`’s `pathname`. Note that this depends on user input, so it’s important to validate explicitly (the generic `Pathname` in TypeScript is `Partial<>` to encourage you to perform these validations).
 *
 * - **`search`:** The [`search` part of the `URL`](https://nodejs.org/api/url.html#url-strings-and-url-objects) parsed into an object. If a field name ends in `[]`, for example, `colors[]`, then multiple occurrences of the same field are captured into an array—this is useful for `<input type="checkbox" />`s with the same `name`. Note that this depends on user input, so it’s important to validate explicitly (the generic `Search` in TypeScript is `Partial<>` to encourage you to perform these validations).
 *
 * - **`cookies`:** The cookies sent via the `Cookie` header parsed into an object. Note that this depends on user input, so it’s important to validate explicitly (the generic `Cookies` in TypeScript is `Partial<>` to encourage you to perform these validations).
 *
 * - **`body`:** The request body parsed into an object. Uses [busboy](https://www.npmjs.com/package/busboy). It supports `Content-Type`s `application/x-www-form-urlencoded` (the default type of form submission in browsers) and `multipart/form-data` (used for uploading files). Form fields become strings, and files become `RequestBodyFile` objects. The files are saved to disk in a temporary directory and deleted after the response is sent—if you wish to keep the files you must move them to a permanent location. If a field name ends in `[]`, for example, `colors[]`, then multiple occurrences of the same field are captured into an array—this is useful for `<input type="checkbox" />`s with the same `name`, and for uploading multiple files. Note that this depends on user input, so it’s important to validate explicitly (the generic `Body` in TypeScript is `Partial<>` to encourage you to perform these validations).
 *
 * - **`state`:** An object to communicate state across multiple `handler`s that handle the same request, for example, a handler may authenticate a user and set a `request.state.user` property for subsequent `handler`s to use. Note that the generic `State` in TypeScript is `Partial<>` because the state may not be set depending on which `handler`s ran previously—you may either use runtime checks that the expected `state` is set, or use, for example, `request.state.user!` if you’re sure that the state is set by other means.
 *
 * - **`getFlash()`:** Get a flash message that was set by a previous `response` that `setFlash()` and then `redirect()`ed. This is useful, for example, for a message such as “User settings updated successfully.”
 *
 * - **`error:`** In error handlers, this is the error that was thrown.
 *
 *   > **Note:** There’s an special kind of error that may be thrown, which is the string `"validation"`. This sets the HTTP response status to [422](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422) instead of [500](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500).
 *
 * - **`liveConnection`:** When the Request is a Live Connection, this property contains information about the state:
 *
 *   - **`"establishingWithoutUpdate"`:** This is the first time that this Request is going through the application code, because the Live Connection is just being established. Additionally, a Live Connection update **is not** necessary, because the page **has not** changed since the initial response was sent. You may use this state to, for example, start a [`backgroundJob()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/node#backgroundjob) which updates a timestamp of when a user has last been seen online, and then end the response right away.
 *
 *   - **`"establishingWithUpdate"`:** This is the first time that this Request is going through the application code, because the Live Connection is just being established. Additionally, a Live Connection update **is** necessary, because the page **has** changed since the initial response was sent. You may use this state to, for example, start a [`backgroundJob()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/node#backgroundjob) which updates a timestamp of when a user has last been seen online, and then let the Request go though the application code normally to produce a Live Connection update.
 *
 *   - **`"update"`:** This is **not** the first time that this Request is going through the application code, because the Live Connection had been established already. This should produce a Live Connection update.
 */
export type Request<Pathname, Search, Cookies, Body, State> =
  http.IncomingMessage & {
    id: string;
    start: bigint;
    log: (...messageParts: string[]) => void;
    ip: string;
    URL: URL;
    pathname: Partial<Pathname>;
    search: Partial<Search>;
    cookies: Partial<Cookies>;
    body: Partial<Body>;
    state: Partial<State>;
    getFlash: () => string | undefined;
    error?: unknown;
    liveConnection?:
      | "establishingWithoutUpdate"
      | "establishingWithUpdate"
      | "update";
  };

/**
 * A type that may appear under elements of `request.body` which includes information about the file that was uploaded and the `path` in a temporary directory where you may find the file. The files are deleted after the response is sent—if you wish to keep them you must move them to a permanent location.
 */
export type RequestBodyFile = busboy.FileInfo & { path: string };

/**
 * Information about a Live Connection that is available under `request.liveConnection`.
 *
 * - **`establish`:** Whether the connection is just being established. In other words, whether it’s the first time that the `handler`s are being called for this request. You may use this, for example, to start a [`backgroundJob()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/node#backgroundjob) which updates a timestamp of when a user has last been seen online.
 *
 * - **`skipUpdateOnEstablish`:** Whether it’s necessary to send an update with a new version of the page upon establishing the Live Connection. An update may be skipped if the page hasn’t been marked as modified since the last update was sent. You must only check this variable if `establish` is `true`.
 */
export type RequestLiveConnection = {
  establish?: boolean;
  skipUpdateOnEstablish?: boolean;
};

/**
 * An extension of [Node.js’s `http.ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) with the following extra functionality:
 *
 * > **Note:** The extra functionality is only available in requests that are **not** Live Connections, because Live Connections must not set headers.
 *
 * - **`setCookie`:** Sets a [`Set-Cookie` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) with secure settings. Also updates the `request.cookies` object so that the new cookies are visible from within the request itself.
 *
 *   > **Note:** The noteworthy cookie settings are the following:
 *   >
 *   > - The cookie name is prefixed with [`__Host-`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#__host-). This assumes that the application is available under a single domain, and that the application is the only thing running on that domain (it can’t, for example, be mounted under a `/my-application/` pathname and share a domain with other applications).
 *   > - The `SameSite` cookie option is set to `None`, which is necessary for things like SAML to work (for example, when the Identity Provider sends a `POST` request back to the application’s Assertion Consumer Service (ACS), the application needs the cookies to determine if there’s a previously established session).
 *
 * - **`deleteCookie`:** Sets an expired [`Set-Cookie` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) without a value and with the same secure settings used by `setCookie`. Also updates the `request.cookies` object so that the new cookies are visible from within the request itself.
 *
 * - **`setFlash()`:** Set a flash message that will be available to the next `request` via `getFlash()` (the next `request` typically is the result of a `redirect()`ion). This is useful, for example, for a message such as “User settings updated successfully.”
 *
 * - **`redirect`:** Sends the [`Location` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location) and an HTTP status of [303 (`"see-other"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303) (default), [307 (`"temporary"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/307), or [308 (`"permanent"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/308). Note that there are no options for the legacy statuses of [301](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301) and [302](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302), because they may lead some clients to change the HTTP method of the redirected request by mistake. The `destination` parameter is relative to `request.URL`, for example, if no `destination` is provided, then the default is to redirect to the same `request.URL`.
 */
export type Response = http.ServerResponse & {
  setCookie: (key: string, value: string, maxAge?: number) => Response;
  deleteCookie: (key: string) => Response;
  setFlash: (message: string) => Response;
  redirect: (
    destination?: string,
    type?: "see-other" | "temporary" | "permanent" | "live-navigation",
  ) => Response;
};

type LiveConnection = RequestLiveConnection & {
  request: Request<{}, {}, {}, {}, {}>;
  response: Response & { liveConnectionEnd?: () => void };
  writableEnded?: boolean;
  update?: () => void;
  deleteTimeout?: NodeJS.Timeout;
};

/**
 * An extension of [Node.js’s `http.createServer()`](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) which provides all the extra functionality of `@radically-straightforward/server`. Refer to the `README` for more information.
 *
 * - **`port`:** A port number for the server. By default it’s `18000`, which is well out of the range of most applications to avoid collisions.
 *
 * - **`csrfProtectionExceptionPathname`:** Exceptions for the CSRF prevention mechanism. This may be, for example, `new RegExp("^/saml/(?:assertion-consumer-service|single-logout-service)$")` for applications that work as SAML Service Providers which include routes for Assertion Consumer Service (ACS) and Single Logout (SLO), because the Identity Provider makes the browser send these requests as cross-origin `POST`s (but SAML includes other mechanisms to prevent CSRF in these situations).
 */
export default function server({
  port = 18000,
  csrfProtectionExceptionPathname = "",
}: {
  port?: number;
  csrfProtectionExceptionPathname?: string | RegExp;
} = {}): Route[] {
  const routes = new Array<Route>();
  const flashes = new Map<string, string>();
  const liveConnections = new Set<LiveConnection>();

  const httpServer = http
    .createServer((async (
      request: Request<
        { [key: string]: string },
        { [key: string]: string | string[] },
        { [key: string]: string },
        {
          [key: string]:
            | string
            | RequestBodyFile
            | string[]
            | RequestBodyFile[];
        },
        { [key: string]: unknown }
      > & { liveConnection?: LiveConnection },
      response: Response & { liveConnectionEnd?: () => void },
    ) => {
      try {
        request.id = utilities.randomString();

        request.start = process.hrtime.bigint();

        request.log = (...messageParts: string[]): void => {
          log(
            request.id,
            `${(process.hrtime.bigint() - request.start) / 1_000_000n}ms`,
            ...messageParts,
          );
        };

        request.ip = String(request.headers["x-forwarded-for"] ?? "127.0.0.1");

        request.log(
          "REQUEST",
          request.ip,
          request.method ?? "UNDEFINED",
          request.url ?? "UNDEFINED",
        );

        if (request.method === undefined || request.url === undefined)
          throw new Error("Missing request ‘method’ or ‘url’.");

        request.URL = new URL(
          request.url,
          `${request.headers["x-forwarded-proto"] ?? "http"}://${
            request.headers["x-forwarded-host"] ?? request.headers["host"]
          }`,
        );

        if (
          request.method !== "GET" &&
          request.headers["csrf-protection"] !== "true" &&
          ((typeof csrfProtectionExceptionPathname === "string" &&
            request.URL.pathname !== csrfProtectionExceptionPathname) ||
            (csrfProtectionExceptionPathname instanceof RegExp &&
              request.URL.pathname.match(csrfProtectionExceptionPathname) ===
                null))
        ) {
          response.statusCode = 403;
          throw new Error(
            "This request appears to have come from outside the application. Please close this tab and start again. (Cross-Site Request Forgery (CSRF) protection failed.)",
          );
        }

        request.search = {};
        for (const [key, value] of request.URL.searchParams)
          if (key.endsWith("[]"))
            (
              (request.search[key.slice(0, -"[]".length)] ??= []) as string[]
            ).push(value);
          else request.search[key] = value;

        request.cookies = Object.fromEntries(
          (request.headers["cookie"] ?? "").split(";").flatMap((pair) => {
            if (pair.trim() === "") return [];
            const parts = pair
              .split("=")
              .map((part) => decodeURIComponent(part.trim()));
            if (parts.length !== 2 || parts.some((part) => part === ""))
              throw new Error("Malformed ‘Cookie’ header.");
            parts[0] = parts[0].replace(/^__Host-/, "");
            return [parts];
          }),
        );

        request.body = {};
        if (typeof request.headers["content-type"] === "string") {
          const directoriesToDelete = new Set<string>();
          response.once("close", async () => {
            for (const directoryToDelete of directoriesToDelete)
              await fs.rm(directoryToDelete, {
                recursive: true,
                force: true,
              });
          });
          const filesPromises = new Set<Promise<void>>();
          await new Promise<void>((resolve, reject) => {
            request.pipe(
              busboy({
                headers: request.headers,
                preservePath: true,
                limits: {
                  headerPairs: 200,
                  fields: 300,
                  fieldNameSize: 300,
                  fieldSize: 2 ** 20,
                  files: 100,
                  fileSize: 10 * 2 ** 20,
                },
              })
                .on("field", (name, value, information) => {
                  if (information.nameTruncated || information.valueTruncated) {
                    response.statusCode = 413;
                    reject(new Error("Field too large."));
                  }
                  if (name.endsWith("[]"))
                    (
                      (request.body[name.slice(0, -"[]".length)] ??= []) as (
                        | string
                        | RequestBodyFile
                      )[]
                    ).push(value);
                  else request.body[name] = value;
                })
                .on("file", (name, file, information) => {
                  if (information.filename.length > 200) {
                    response.statusCode = 413;
                    reject(new Error("File name too large."));
                  }
                  const value = {
                    ...information,
                    path: path.join(
                      os.tmpdir(),
                      `server--file--${utilities.randomString()}`,
                      information.filename.trim() === ""
                        ? "file"
                        : information.filename
                            .replace(/[^A-Za-z0-9\-_\.]/gu, "-")
                            .toLowerCase(),
                    ),
                  };
                  if (name.endsWith("[]"))
                    (
                      (request.body[name.slice(0, -"[]".length)] ??= []) as (
                        | string
                        | RequestBodyFile
                      )[]
                    ).push(value);
                  else request.body[name] = value;
                  filesPromises.add(
                    (async (): Promise<void> => {
                      directoriesToDelete.add(path.dirname(value.path));
                      await fs.mkdir(path.dirname(value.path));
                      await fs.writeFile(value.path, file);
                      if (file.truncated) {
                        response.statusCode = 413;
                        throw new Error("File too large.");
                      }
                    })(),
                  );
                })
                .on("close", () => {
                  resolve();
                })
                .on("fieldsLimit", () => {
                  response.statusCode = 413;
                  reject(new Error("Too many fields."));
                })
                .on("filesLimit", () => {
                  response.statusCode = 413;
                  reject(new Error("Too many files."));
                })
                .on("error", (error) => {
                  reject(error);
                }),
            );
          });
          await Promise.all(filesPromises);
        }

        request.getFlash = () => {
          if (typeof request.cookies.flash !== "string") return undefined;
          const flash = flashes.get(request.cookies.flash);
          flashes.delete(request.cookies.flash);
          response.deleteCookie("flash");
          return flash;
        };

        if (process.env.NODE_ENV !== "production" && request.method !== "GET")
          request.log(JSON.stringify(request.body, undefined, 2));
      } catch (error) {
        request.log("ERROR", String(error));
        if (response.statusCode === 200) response.statusCode = 400;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(String(error));
      }

      if (!response.writableEnded) {
        if (request.method === "GET" && request.URL.pathname === "/_health")
          response.end();
        else if (request.method === "GET" && request.URL.pathname === "/_proxy")
          try {
            if (typeof request.search.destination !== "string") {
              response.statusCode = 422;
              throw new Error("Missing ‘destination’ search parameter.");
            }

            let destination: URL;
            try {
              destination = new URL(request.search.destination);
            } catch (error) {
              response.statusCode = 422;
              throw new Error("Invalid destination.");
            }
            if (
              (destination.protocol !== "http:" &&
                destination.protocol !== "https:") ||
              destination.hostname === request.URL.hostname
            ) {
              response.statusCode = 422;
              throw new Error("Invalid destination.");
            }

            const destinationResponse = await fetch(destination.href, {
              signal: AbortSignal.timeout(30 * 1000),
            });
            const destinationResponseContentType =
              destinationResponse.headers.get("Content-Type");
            if (
              !destinationResponse.ok ||
              typeof destinationResponseContentType !== "string" ||
              destinationResponseContentType.match(
                new RegExp("^(?:image|video|audio)/"),
              ) === null ||
              !(destinationResponse.body instanceof ReadableStream)
            )
              throw new Error("Invalid destination response.");

            response.setHeader("Content-Type", destinationResponseContentType);
            // @ts-expect-error: https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/68986
            await stream.pipeline(destinationResponse.body, response, {
              signal: AbortSignal.timeout(5 * 60 * 1000),
            });
          } catch (error) {
            request.log("ERROR", String(error));
            if (!response.headersSent) {
              if (response.statusCode === 200) response.statusCode = 502;
              response.setHeader("Content-Type", "text/plain; charset=utf-8");
            }
            if (!response.writableEnded) response.end(String(error));
          }
        else if (
          request.ip === "127.0.0.1" &&
          request.method === "POST" &&
          request.URL.pathname === "/__live-connections"
        )
          try {
            if (
              typeof request.body.pathname !== "string" ||
              request.body.pathname.trim() === ""
            )
              throw new Error("Invalid ‘pathname’.");
            response.once("close", async () => {
              for (const liveConnection of liveConnections) {
                if (
                  liveConnection.request.URL.pathname.match(
                    new RegExp(request.body.pathname as string),
                  ) === null
                )
                  continue;
                liveConnection.skipUpdateOnEstablish = false;
                if (!(liveConnection.response.socket?.destroyed ?? true))
                  liveConnection.update?.();
                await timers.setTimeout(200, undefined, { ref: false });
              }
            });
            response.end();
          } catch (error) {
            request.log("ERROR", String(error));
            response.statusCode = 422;
            response.setHeader("Content-Type", "text/plain; charset=utf-8");
            response.end(String(error));
          }
        else {
          const liveConnectionId = request.headers["live-connection"];
          if (typeof liveConnectionId === "string")
            try {
              if (
                request.method !== "GET" ||
                liveConnectionId.match(/^[a-z0-9]{5,}$/) === null
              )
                throw new Error("Invalid ‘Live-Connection’ header.");

              request.liveConnection = [...liveConnections].find(
                (liveConnection) =>
                  liveConnection.request.id === liveConnectionId,
              );
              if (request.liveConnection === undefined) {
                request.log("LIVE CONNECTION CREATE", liveConnectionId);
                request.id = liveConnectionId;
                request.liveConnection = { request, response };
                liveConnections.add(request.liveConnection);
              } else if (
                request.liveConnection.request.URL.href !== request.URL.href
              )
                throw new Error("Unmatched ‘href’ of existing request.");
              else {
                request.log(
                  "LIVE CONNECTION ESTABLISH",
                  request.liveConnection.request.id,
                  request.liveConnection.skipUpdateOnEstablish
                    ? "SKIP UPDATE"
                    : "UPDATE",
                );
                clearTimeout(request.liveConnection.deleteTimeout);
                request.liveConnection.response.liveConnectionEnd?.();
                request.id = request.liveConnection.request.id;
                request.liveConnection.request = request;
                request.liveConnection.response = response;
              }
              response.once("close", () => {
                request.log("LIVE CONNECTION CLOSE");
                if (request.liveConnection!.request === request)
                  request.liveConnection!.deleteTimeout = setTimeout(() => {
                    request.log("LIVE CONNECTION DELETE");
                    liveConnections.delete(request.liveConnection!);
                  }, 30 * 1000).unref();
              });

              response.setHeader(
                "Content-Type",
                "application/json-lines; charset=utf-8",
              );

              const heartbeat = node.backgroundJob(
                { interval: 30 * 1000 },
                () => {
                  response.write("\n");
                },
              );
              response.once("close", () => {
                heartbeat.stop();
              });

              const periodicUpdates = node.backgroundJob(
                { interval: 5 * 60 * 1000 },
                () => {
                  request.liveConnection!.update?.();
                },
              );
              response.once("close", () => {
                periodicUpdates.stop();
              });

              request.liveConnection.establish = true;

              response.liveConnectionEnd = response.end;
              response.end = ((data?: string): typeof response => {
                request.log("LIVE CONNECTION RESPONSE");
                request.liveConnection!.writableEnded = true;
                if (typeof data === "string")
                  response.write(JSON.stringify(data) + "\n");
                return response;
              }) as (typeof response)["end"];
            } catch (error) {
              request.log("LIVE CONNECTION ERROR", String(error));
              response.statusCode = 400;
              response.setHeader("Content-Type", "text/plain; charset=utf-8");
              response.end(String(error));
            }
          else {
            response.setHeader("Content-Type", "text/html; charset=utf-8");

            response.setCookie = (
              key: string,
              value: string,
              maxAge: number = 150 * 24 * 60 * 60,
            ): typeof response => {
              request.cookies[key] = value;
              response.setHeader("Set-Cookie", [
                ...((response.getHeader("Set-Cookie") as string[]) ?? []),
                `__Host-${encodeURIComponent(key)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=None`,
              ]);
              return response;
            };

            response.deleteCookie = (key: string): typeof response => {
              delete request.cookies[key];
              response.setHeader("Set-Cookie", [
                ...((response.getHeader("Set-Cookie") as string[]) ?? []),
                `__Host-${encodeURIComponent(key)}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None`,
              ]);
              return response;
            };

            response.setFlash = (message: string): typeof response => {
              const flashIdentifier = utilities.randomString();
              flashes.set(flashIdentifier, message);
              setTimeout(
                () => {
                  flashes.delete(flashIdentifier);
                },
                2 * 60 * 1000,
              ).unref();
              response.setCookie("flash", flashIdentifier, 2 * 60);
              return response;
            };

            response.redirect = (
              destination: string = "",
              type:
                | "see-other"
                | "temporary"
                | "permanent"
                | "live-navigation" = "see-other",
            ): typeof response => {
              response.statusCode =
                request.headers["live-navigation"] === "true" &&
                !destination.startsWith("/")
                  ? 200
                  : {
                      "see-other": 303,
                      temporary: 307,
                      permanent: 308,
                      "live-navigation": 200,
                    }[type];
              response.setHeader(
                "Location",
                new URL(destination, request.URL).href,
              );
              response.end();
              return response;
            };
          }

          if (!response.writableEnded)
            do {
              let liveConnectionUpdate;
              if (request.liveConnection !== undefined) {
                if (!request.liveConnection.establish)
                  request.log("LIVE CONNECTION REQUEST");
                request.liveConnection.writableEnded = false;
                liveConnectionUpdate = new Promise<void>((resolve) => {
                  request.liveConnection!.update = resolve;
                });
              }

              request.state = {};
              delete request.error;
              for (const route of routes) {
                if (
                  (typeof route.method === "string" &&
                    request.method !== route.method) ||
                  (route.method instanceof RegExp &&
                    request.method!.match(route.method) === null)
                )
                  continue;

                if (
                  typeof route.pathname === "string" &&
                  request.URL.pathname !== route.pathname
                )
                  continue;
                else if (route.pathname instanceof RegExp) {
                  const match = request.URL.pathname.match(route.pathname);
                  if (match === null) continue;
                  request.pathname = match.groups ?? {};
                } else request.pathname = {};

                if ((request.error !== undefined) !== (route.error ?? false))
                  continue;

                try {
                  await route.handler(request, response);
                } catch (error) {
                  request.log(
                    "ERROR",
                    String(error),
                    (error as Error)?.stack ?? "",
                  );
                  response.statusCode = error === "validation" ? 422 : 500;
                  request.error = error;
                }

                if ((request.liveConnection ?? response).writableEnded) break;
              }

              if (!(request.liveConnection ?? response).writableEnded) {
                request.log(
                  "ERROR",
                  "The application didn’t finish handling this request.",
                );
                if (!response.headersSent) {
                  response.statusCode = 500;
                  response.setHeader(
                    "Content-Type",
                    "text/plain; charset=utf-8",
                  );
                }
                response.end(
                  "The application didn’t finish handling this request.",
                );
              }

              if (request.liveConnection !== undefined) {
                request.liveConnection.establish = false;
                request.liveConnection.skipUpdateOnEstablish = true;
                await liveConnectionUpdate;
              }
            } while (request.liveConnection !== undefined);

          if (
            request.method === "GET" &&
            response.statusCode === 200 &&
            response.getHeader("Content-Type") === "text/html; charset=utf-8"
          ) {
            request.log("LIVE CONNECTION PREPARE");
            const liveConnection = {
              request,
              response,
              skipUpdateOnEstablish: true,
              deleteTimeout: setTimeout(() => {
                request.log("LIVE CONNECTION DELETE");
                liveConnections.delete(liveConnection);
              }, 30 * 1000).unref(),
            };
            liveConnections.add(liveConnection);
          }
        }
      }

      request.log(
        "RESPONSE",
        String(response.statusCode),
        String(response.getHeader("Location") ?? ""),
      );
    }) as (
      request: http.IncomingMessage,
      response: http.ServerResponse,
    ) => Promise<void>)
    .listen(port, "localhost", () => {
      log("START");
    });
  process.once("gracefulTermination", () => {
    httpServer.close();
    for (const liveConnection of liveConnections)
      liveConnection.response.liveConnectionEnd?.();
  });
  process.once("beforeExit", () => {
    log("STOP");
  });

  return routes;

  function log(...messageParts: string[]): void {
    utilities.log("SERVER", String(port), ...messageParts);
  }
}
