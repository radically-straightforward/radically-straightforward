# Radically Straightforward · Server

**🦾 HTTP server in Node.js**

## Introduction

`@radically-straightforward/server` is a layer on top of Node.js’s [HTTP server](https://nodejs.org/api/http.html). The `server()` function is similar to [`http.createServer()`](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener), and we follow Node.js’s way of doing things as much as possible. You should familiarize yourself with how to create a server with Node.js to appreciate what `@radically-straightforward/server` provides—the rest of this documentation assumes that you have read [Node.js’s documentation](https://nodejs.org/api/http.html).

Here’s an overview of `@radically-straightforward/server` provides on top of Node.js’s `http` module:

- **[Router](#router):** Simple to understand and powerful.

- **[Request Parsing](#request-parsing):** Including file uploads.

- **[Response Helpers](#response-helpers):** Set cookies with secure options by default, send redirect responses, and so forth.

- **[Live Connection](#live-connection):** Update a page with new contents without reloading (for better user experience) using server-side rendering (for better developer experience), detect that the user has internet connection, and much more.

- **[Health Check](#health-check):** A simple but useful feature that’s built-in.

- **[Image/Video/Audio Proxy](#imagevideoaudio-proxy):** Avoid issues with [mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) and [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP).

- **[CSRF Protection](#csrf-protection):** It’s built-in.

- **[Convenient Defaults](#convenient-defaults):** Logging of requests and responses, graceful termination, and so forth.

## Installation

```console
$ npm install @radically-straightforward/server
```

## Example

```typescript
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";
import html from "@radically-straightforward/html";

// CSRF Protection is turned off to simplify this example. You should use `@radically-straightforward/javascript` with Live Navigation instead.
const application = server({ csrfProtectionExceptionPathname: new RegExp("") });

const messages = new Array<string>();

application.push({
  method: "GET",
  pathname: "/",
  handler: (request, response) => {
    response.end(html`
      <!doctype html>
      <html>
        <head></head>
        <body>
          <h1>@radically-straightforward/server</h1>
          <ul>
            $${messages.map((message) => html`<li>${message}</li>`)}
          </ul>
          <form method="POST">
            <input type="text" name="message" placeholder="Message…" required />
            <button type="submit">Send</button>
          </form>
        </body>
      </html>
    `);
  },
});

application.push({
  method: "POST",
  pathname: "/",
  handler: (
    request: serverTypes.Request<{}, {}, {}, { message: string }, {}>,
    response,
  ) => {
    if (
      typeof request.body.message !== "string" ||
      request.body.message.trim() === ""
    )
      throw "validation";
    messages.push(request.body.message);
    response.redirect();
  },
});
```

Visit <http://localhost:18000>.

## Features

### Router

Node.js’s `http.createServer()` expects one `requestListener`—a function which is capable of handling every kind of request that your server may ever receive. But typically it makes more sense to organize an application into multiple functions, which may even live in different files. For example, one function for the home page, another for the settings page, and so forth. And these functions should run only if the HTTP request satisfies some conditions, for example, the function for the settings page should run only if the HTTP method is `GET` and the pathname is `/settings`.

That’s what the `@radically-straightforward/server` router does: It allows you to define multiple functions that are called depending on the characteristics of the request.

See the [`Route` type](#route) for more details.

> **Compared to Other Libraries**
>
> `@radically-straightforward/server`’s router is simpler: It’s an Array of [`Route`s](#route) that are tested against the request one by one in order and that may or may not apply. A `@radically-straightforward/server` application is more straightforward to understand than, for example, an application that uses [Express’s nested `Router`s and things like `next("route")`](https://expressjs.com/en/4x/api.html).
>
> At the same time, `@radically-straightforward/server`’s router has features that other libraries lack, for example:
>
> - When a route has finished running, `@radically-straightforward/server` checks whether a response has been sent and stops subsequent routes from running. This prevents you from writing content to a response that has already `end()`ed.
> - When every route has been considered, `@radically-straightforward/server` checks whether the response hasn’t been sent and responds with an error. This prevents you from leaving a request without a response.
>
> Together, this means that `@radically-straightforward/server` does the right thing without you having to remember to call `next()`.
>
> > **Note:** If you need to run code after the response has been sent (that is, code that would be below a call to `next()` in an Express middleware), you should use Node.js’s `response.once("close")` event.
>
> Also, `@radically-straightforward/server`’s routes support asynchronous functions, which is unsupported in Express version 4 (it’s supported in the 5 beta version).

### Request Parsing

The Node.js `http` module only parses the request up to the point of distinguishing the headers from the body and separating the headers from one another. This is by design, to keep things flexible.

In `@radically-straightforward/server` we take request parsing some steps further, satisfying the needs of most web applications. We parse the request URL, cookies, body (including regular forms and file uploads), and so forth.

We also include an assortment of request helpers including a unique request identifier, a logger, and so forth.

See the [`Request` type](#request) for more details.

> **Compared to Other Libraries**
>
> `@radically-straightforward/server` is more batteries-included in this area, and it doesn’t require any configuration (consider, for example, [Express’s `app.use(express.urlencoded({ extended: true }))`](https://expressjs.com/en/4x/api.html#express.urlencoded)).

### Response Helpers

Send cookies and redirects with secure options by default.

See the [`Response` type](#response) for more details.

> **Compared to Other Libraries**
>
> `@radically-straightforward/server` offers fewer settings and less **sugar**, for example, instead of [Express’s `response.json(___)`](https://expressjs.com/en/4x/api.html#res.json), you should use Node.js’s `response.setHeader("Content-Type", "application/json; charset=utf-8").end(JSON.stringify(___))`.

### Live Connection

Live Connections are a simple but powerful solution to many typical problems in web applications, for example:

- Update a page with new contents without reloading (for better user experience) using server-side rendering (for better developer experience).

- Detect that the user has internet connection (or, more specifically, that the browser may connect to the server).

- Register that a user is online.

- Detect that a new version of the application has been deployed and a reload may be necessary.

- In development, perform a reload when a file has been modified (something often called **Live Reload** in other tools).

- And more…

> **Note:** Use Live Connections with [`@radically-straightforward/javascript`](https://github.com/radically-straightforward/radically-straightforward/tree/main/javascript#liveconnection), which implements the browser side of these features and subsumes many of the details below.

A Live Connection is a variation on a `GET` request in which the server doesn’t `response.end()`, but leaves the connection open and the browser waiting for more content. When there’s a change that requires an update on the page, the server runs the `request` and `response` through the routes again and sends the updated page to the browser through that connection.

From the perspective of the application developer this is advantageous because there’s a single source of truth for how to present a page to the user: the server-side rendered page. It’s as if the browser knew that a new version of a page is available and requested it. Also, in combination with [`@radically-straightforward/javascript`](https://github.com/radically-straightforward/radically-straightforward/tree/main/javascript#liveconnection) only the part of the page that changed is touched (without the need for virtual DOMs, complex browser state management, and so forth).

To establish a Live Connection perform a `GET` request with the `Live-Connection` header set to the `request.id` of the request for the original page (or, failing that, to a random string which will become the `request.id` moving forward), for example:

```javascript
await fetch(location.href, {
  headers: { "Live-Connection": requestIdWhichWasObtainedInSomeWay },
});
```

This changes the behavior of `@radically-straightforward/server`:

- The `Content-Type` of the response is set to `application/json-lines; charset=utf-8` ([JSON lines](https://jsonlines.org/)).

- You may not set headers or cookies (which includes not being able to manipulate user sessions).

- `response.end(___)` doesn’t end the response, but `response.write(___)`s it in a new line of JSON, so that the browser stays connected and waiting for more content.

- Periodically a heartbeat (a newline without any JSON) is sent to keep the connection alive even when there are pieces of infrastructure that would otherwise close inactive connections, for example, a proxy on the user’s network.

- Periodically an update is sent with a new version of the page (encoded as a line of JSON). On the server this is implemented by running the `request` and `response` through the routes again. On the browser there should be code to read the streaming response and render the new version of the page by applying the changes without reloading.

- You may trigger an immediate update by performing a request coming from the same machine in which the server is running with a method of `POST` at pathname `/__live-connections` including a form field called `pathname` which is a regular expression for `pathname`s that should receive an immediate update.

- A [`request.liveConnection`](#requestliveconnection) property is set.

> **Note:** If you’re running the server in multiple processes, then Live Connections requires the load balancer to have sticky sessions, because the management of Live Connections is stateful. That’s the default in [`@radically-straightforward/caddy`](https://github.com/radically-straightforward/radically-straightforward/tree/main/caddy).

**Example**

```typescript
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";

const application = server();

application.push({
  handler: (request, response) => {
    if (request.liveConnection?.establish) {
      // Here there could be, for example, a [`backgroundJob()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities#backgroundjob) which updates a timestamp of when a user has last been seen online.
      if (request.liveConnection?.skipUpdateOnEstablish) response.end();
    }
  },
});

application.push({
  method: "GET",
  pathname: new RegExp("^/conversations/(?<conversationId>[0-9]+)$"),
  handler: (request, response) => {
    response.end(
      `<!DOCTYPE html>
        <html>
          <head>
            <script>
              (async () => {
                const responseBodyReader = (await fetch(location.href, { headers: { "Live-Connection": ${JSON.stringify(request.id)} } })).body.pipeThrough(new TextDecoderStream()).getReader();
                while (true) {
                  const value = (
                    await responseBodyReader.read().catch(() => ({ value: undefined }))
                  ).value;
                  if (value === undefined) break;
                  console.log(value);
                }
              })();
            </script>
          </head>
          <body>Live Connection: ${new Date().toISOString()}. Open the Developer Tools Console and see the updates arriving.</body>
        </html>
      `,
    );
  },
});
```

Visit <http://localhost:18000/conversations/10>.

Send an immediate update with one of the following snippets:

```typescript
await fetch("http://localhost:18000/__live-connections", {
  method: "POST",
  headers: { "CSRF-Protection": "true" },
  body: new URLSearchParams({ pathname: "^/conversations/10$" }),
});
```

```console
$ curl --request POST --header "CSRF-Protection: true" --data "pathname=^/conversations/10$" "http://localhost:18000/__live-connections"
```

> **Compared to Other Libraries**
>
> Some tools like [Hotwire](https://hotwired.dev/) has similar concepts, but Live Connection as implemented in `@radically-straightforward/server` is a novel idea.
>
> A Live Connection is reminiscent of [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events). Unfortunately SSEs are limited in features, for example, they don’t allow for sending custom headers (we need a `Live-Connection` header to communicate back to the server the `request.id` of the request for the original page, which avoids an immediate update upon establishing every connection). What’s more, SSEs don’t appear to receive much attention from browser implementors and are unlikely to receive new features.

### Health Check

An endpoint at `/_health` to test whether the application is online. It may be used by [`@radically-straightforward/monitor`](https://github.com/radically-straightforward/radically-straightforward/tree/main/monitor), by [Caddy’s active health checks](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#active-health-checks), and so forth.

> **Compared to Other Libraries**
>
> Typically you either have to add a third-party library specifically to handle health checks, or you have to implement them yourself. In fairness, a health check is straightforward to implement, but it’s nice to have the server library take care of that for you, and it’s nice to have a predictable endpoint for the health check.

### Image/Video/Audio Proxy

An endpoint at `/_proxy?destination=<URL>` (for example, `/_proxy?destination=https%3A%2F%2Finteractive-examples.mdn.mozilla.net%2Fmedia%2Fcc0-images%2Fgrapefruit-slice-332-332.jpg`) which proxies images, videos, and audios from other origins.

This is useful for content generated by users that includes images/videos/audios from third-party websites. It avoids issues with [mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) and [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP).

> **Compared to Other Libraries**
>
> Typically you either have to add a third-party library specifically to handle image/video/audio proxying, or you have to implement it yourself.
>
> Note that the implementation in `@radically-straightforward/server` is very simple: it doesn’t resize images, reencode videos, and so forth; it doesn’t cache images/videos/audios to potentially speed things up and to prevent content from disappearing as third-party websites change; and so forth.

### CSRF Protection

`@radically-straightforward/server` implements the simplest yet effective protection against CSRF: [Requiring a custom request header for non-`GET` requests](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi).

In your application:

- Don’t let routes with method `GET` have side-effects.

- Ensure that all requests with methods other than `GET` (for example, `POST`, `PATCH`, `PUT`, `DELETE`, and so forth) include a header of `CSRF-Protection: true`. If you’re using regular HTML forms, we recommend using [`@radically-straightforward/javascript`’s Live Navigation](https://github.com/radically-straightforward/radically-straightforward/tree/main/javascript#live-navigation) which already does this.

- If there are routes that really should not have CSRF protection, use [`server()`’s `csrfProtectionExceptionPathname` option](#server).

### Convenient Defaults

- **Logging**: In the style of [`@radically-straightforward/utilities`’s `log()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities#log).

- **Graceful Termination:** Using [`@radically-straightforward/node`’s graceful termination](https://github.com/radically-straightforward/radically-straightforward/tree/main/node#graceful-termination).

- **Automatic Management of Uploaded Files:** When parsing the request, the uploaded files are put in a temporary directory, and if the application doesn’t move them to a permanent location, they’re automatically deleted after the response is sent.

- **Designed to Be Used with a Reverse Proxy ([Caddy](https://github.com/radically-straightforward/radically-straightforward/tree/main/caddy)):** A reverse proxy is essential in deploying a Node.js application. It provides HTTPS, HTTP/2 (and newer versions), load balancing between multiple server processes, static file serving, and so forth. Node.js could provide these features, but it’d be slower and clunkier at them. `@radically-straightforward/server` is designed to be used with [`@radically-straightforward/caddy`](https://github.com/radically-straightforward/radically-straightforward/tree/main/caddy), which entails the following:
  - The server binds to `localhost` (because Caddy runs on the same machine) and doesn’t respond to requests coming from other machines.

  - The server trusts the `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` request headers, which normally could be spoofed but can be trusted because they’re set by Caddy.

  - The server doesn’t support serving static files—it doesn’t have the equivalent of [`express.static()`](https://expressjs.com/en/4x/api.html#express.static).

- **Request Size Limits and Timeouts:**

  | Issue           | HTTP response status                                                | Handled by                                                                                                                      |
  | --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
  | Headers too big | [431](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/431) | [Node.js](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) (`maxHeaderSize`)                           |
  | Body too big    | [413](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/413) | [busboy](https://www.npmjs.com/package/busboy) (`headerPairs`, `fields`, `fieldNameSize`, `fieldSize`, `files`, and `fileSize`) |
  | Headers timeout | [408](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/408) | [Node.js](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) (`headersTimeout`)                          |
  | Body timeout    | [408](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/408) | [Node.js](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) (`requestTimeout`)                          |

## Usage

```typescript
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `Server`

```typescript
export type Server = ReturnType<typeof server>;
```

A `Server` is an auxiliary type for convenience.

### `Route`

```typescript
export type Route = {
  ip?: string | RegExp;
  method?: string | RegExp;
  pathname?: string | RegExp;
  error?: boolean;
  handler: (request: Request, response: Response) => void | Promise<void>;
};
```

A `Route` is a combination of some conditions that the request must satisfy for the `handler` to be called, and the `handler` that produces a response. An application is an Array of `Route`s.

- **`ip`:** The IP address of the request, for example `"127.0.0.1"` or `/^127\.\d+.\d+.\d+$/`.

- **`method`:** The HTTP request method, for example `"GET"` or `/^PATCH|PUT$/`.

- **`pathname`:** The [`pathname`](https://nodejs.org/api/url.html#url-strings-and-url-objects) part of the HTTP request. [Named capturing groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Groups_and_backreferences) are available in the `handler` under `request.pathname`, for example, given `pathname: new RegExp("^/conversations/(?<conversationPublicId>[0-9]+)$")`, the `conversationPublicId` is available at `request.pathname.conversationPublicId`.

- **`error`:** Indicates that this `handler` should only be called if a previous `handler` threw an exception.

- **`handler`:** The function that produces the response. It’s similar to a function that you’d provide to [`http.createServer()`](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) as a `requestListener`, with two differences: 1. The `handler` is called only if the request satisfies the conditions above; and 2. The `request` and `response` parameters are extended with extra functionality (see `Request` and `Response`). The `handler` may be synchronous or asynchronous.

### `Request`

```typescript
export type Request<
  Pathname = {
    [key: string]: string;
  },
  Search = {
    [key: string]: string | string[];
  },
  Cookies = {
    [key: string]: string;
  },
  Body = {
    [key: string]: string | RequestBodyFile | string[] | RequestBodyFile[];
  },
  State = {
    [key: string]: unknown;
  },
> = http.IncomingMessage & {
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
  error?: unknown;
  getFlash?: () => string | undefined;
  liveConnection?:
    | "connectingWithoutUpdate"
    | "connectingWithUpdate"
    | "connected";
};
```

An extension of [Node.js’s `http.IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage) with the following extra functionality:

- **`id`:** A unique request identifier.

- **`start`:** A timestamp of when the request arrived.

- **`log()`:** A logging function which includes information about the request and formats the message with [`@radically-straightforward/utilities`’s `log()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities#log).

- **`ip`:** The IP address of the request originator as reported by [Caddy](https://github.com/radically-straightforward/radically-straightforward/tree/main/caddy) (the reverse proxy) (uses the `X-Forwarded-For` HTTP request header).

- **`URL`:** The [`request.url`](https://nodejs.org/api/http.html#messageurl) parsed into a [`URL` object](https://developer.mozilla.org/en-US/docs/Web/API/URL), including the appropriate protocol (uses the `X-Forwarded-Proto` HTTP request header) and host (uses the `X-Forwarded-Host` or the `Host` HTTP request header) as reported by Caddy.

- **`pathname`:** The variable parts of the [`pathname` part of the `URL`](https://nodejs.org/api/url.html#url-strings-and-url-objects), as defined in the named capturing groups of the regular expression from the `route`’s `pathname`. Note that this depends on user input, so it’s important to validate explicitly (the generic `Pathname` in TypeScript is `Partial<>` to encourage you to perform these validations).

- **`search`:** The [`search` part of the `URL`](https://nodejs.org/api/url.html#url-strings-and-url-objects) parsed into an object. If a field name ends in `[]`, for example, `colors[]`, then multiple occurrences of the same field are captured into an array—this is useful for `<input type="checkbox" />`s with the same `name`. Note that this depends on user input, so it’s important to validate explicitly (the generic `Search` in TypeScript is `Partial<>` to encourage you to perform these validations).

- **`cookies`:** The cookies sent via the `Cookie` header parsed into an object. Note that this depends on user input, so it’s important to validate explicitly (the generic `Cookies` in TypeScript is `Partial<>` to encourage you to perform these validations).

- **`body`:** The request body parsed into an object. Uses [busboy](https://www.npmjs.com/package/busboy). It supports `Content-Type`s `application/x-www-form-urlencoded` (the default type of form submission in browsers) and `multipart/form-data` (used for uploading files). Form fields become strings, and files become `RequestBodyFile` objects. The files are saved to disk in a temporary directory and deleted after the response is sent—if you wish to keep the files you must move them to a permanent location. If a field name ends in `[]`, for example, `colors[]`, then multiple occurrences of the same field are captured into an array—this is useful for `<input type="checkbox" />`s with the same `name`, and for uploading multiple files. Note that this depends on user input, so it’s important to validate explicitly (the generic `Body` in TypeScript is `Partial<>` to encourage you to perform these validations).

- **`state`:** An object to communicate state across multiple `handler`s that handle the same request, for example, a handler may authenticate a user and set a `request.state.user` property for subsequent `handler`s to use. Note that the generic `State` in TypeScript is `Partial<>` because the state may not be set depending on which `handler`s ran previously—you may either use runtime checks that the expected `state` is set, or use, for example, `request.state.user!` if you’re sure that the state is set by other means.

- **`error:`** In error handlers, this is the error that was thrown by a previous handler.

  > **Note:** There’s an special kind of error that may be thrown, which is the string `"validation"`. This sets the HTTP response status to [422](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422) instead of [500](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500).

- **`getFlash()`:** Get a flash message that was set by a previous `response` that `setFlash()` and then `redirect()`ed. This is useful, for example, for a message such as “User settings updated successfully.” (This function is only available in requests that are **not** Live Connections, because Live Connections must not set headers.)

- **`liveConnection`:** When the Request is a Live Connection, this property contains information about the state:
  - **`"connectingWithoutUpdate"`:** This is the first time that this Request is going through the application code, because the Live Connection is just being established. Additionally, a Live Connection update **is not** necessary, because the page **has not** changed since the initial response was sent. You may use this state to, for example, start a [`backgroundJob()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/node#backgroundjob) which updates a timestamp of when a user has last been seen online, and then `response.end()` right away.

  - **`"connectingWithUpdate"`:** This is the first time that this Request is going through the application code, because the Live Connection is just being established. Additionally, a Live Connection update **is** necessary, because the page **has** changed since the initial response was sent. You may use this state to, for example, start a [`backgroundJob()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/node#backgroundjob) which updates a timestamp of when a user has last been seen online, and then let the Request go though the application code normally to produce a Live Connection update.

  - **`"connected"`:** This is **not** the first time that this Request is going through the application code, because the Live Connection had been established already. This should produce a Live Connection update.

### `RequestBodyFile`

```typescript
export type RequestBodyFile = busboy.FileInfo & {
  path: string;
};
```

A type that may appear under elements of `request.body` which includes information about the file that was uploaded and the `path` in a temporary directory where you may find the file. The files are deleted after the response is sent—if you wish to keep them you must move them to a permanent location.

### `Response`

```typescript
export type Response = http.ServerResponse & {
  mayStartLiveConnection: () => boolean;
  setCookie?: (key: string, value: string, maxAge?: number) => Response;
  deleteCookie?: (key: string) => Response;
  setFlash?: (message: string) => Response;
  redirect?: (
    destination?: string,
    type?: "see-other" | "temporary" | "permanent" | "live-navigation",
  ) => Response;
  ended: boolean;
};
```

An extension of [Node.js’s `http.ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) with the following extra functionality:

- **`mayStartLiveConnection()`:** Whether the Response may start a Live Connection.

- **`setCookie`():** Sets a [`Set-Cookie` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) with secure settings. Also updates the `request.cookies` object so that the new cookies are visible from within the request itself. (This function is only available in requests that are **not** Live Connections, because Live Connections must not set headers.)

  > **Note:** The noteworthy cookie settings are the following:
  >
  > - The cookie name is prefixed with [`__Host-`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#__host-). This assumes that the application is available under a single domain, and that the application is the only thing running on that domain (it can’t, for example, be mounted under a `/my-application/` pathname and share a domain with other applications).
  > - The `SameSite` cookie option is set to `None`, which is necessary for things like SAML to work (for example, when the Identity Provider sends a `POST` request back to the application’s Assertion Consumer Service (ACS), the application needs the cookies to determine if there’s a previously established session).

- **`deleteCookie()`:** Sets an expired [`Set-Cookie` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) without a value and with the same secure settings used by `setCookie`. Also updates the `request.cookies` object so that the new cookies are visible from within the request itself. (This function is only available in requests that are **not** Live Connections, because Live Connections must not set headers.)

- **`setFlash()`:** Set a flash message that will be available to the next `request` via `getFlash()` (the next `request` typically is the result of a `redirect()`ion). This is useful, for example, for a message such as “User settings updated successfully.” (This function is only available in requests that are **not** Live Connections, because Live Connections must not set headers.)

- **`redirect()`:** Sends the [`Location` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location) and an HTTP status of [303 (`"see-other"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303) (default), [307 (`"temporary"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/307), or [308 (`"permanent"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/308). Note that there are no options for the legacy statuses of [301](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301) and [302](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302), because they may lead some clients to change the HTTP method of the redirected request by mistake. The `destination` parameter is relative to `request.URL`, for example, if no `destination` is provided, then the default is to redirect to the same `request.URL`. (This function is only available in requests that are **not** Live Connections, because Live Connections must not set headers.)

- **`ended`:** Whether `response.end()` has been called. This is different from [`response.writableEnded`](https://nodejs.org/docs/latest/api/http.html#responsewritableended) in the following ways:
  1. Under special circumstances you may **set** this attribute, for example, if you respond with `stream.pipeline(___, response)` then `response.writableEnded` is `false`, but the server shouldn’t continue considering other routes.

  2. `ended` supports Live Connection updates.

### `server()`

```typescript
export default function server({
  port = 18000,
  csrfProtectionExceptionPathname = "",
}: {
  port?: number;
  csrfProtectionExceptionPathname?: string | RegExp;
} = {}): Route[];
```

An extension of [Node.js’s `http.createServer()`](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) which provides the extra functionality of `@radically-straightforward/server`. Refer to the `README` for more information.

- **`port`:** A port number for the server. By default it’s `18000`, which is well out of the range of most applications to avoid collisions.

- **`csrfProtectionExceptionPathname`:** Exceptions for the CSRF prevention mechanism. This may be, for example, `new RegExp("^/saml/(?:assertion-consumer-service|single-logout-service)$")` for applications that work as SAML Service Providers which include routes for Assertion Consumer Service (ACS) and Single Logout (SLO), because the Identity Provider makes the browser send these requests as cross-origin `POST`s (but SAML includes other mechanisms to prevent CSRF in these situations).

<!-- DOCUMENTATION END: ./source/index.mts -->

## Related Work

### Server Libraries

- <https://expressjs.com/>
- <https://fastify.dev/>
- <https://koajs.com/>
- <https://hono.dev/>
- <https://routup.net/>
- <https://itty.dev/itty-router>
- <https://github.com/lukeed/worktop>
- And so forth…

For a feature-by-feature comparison, refer to the sections named **Compared to Other Libraries**.

In a nutshell, `@radically-straightforward/server` does **less and more** than other libraries. It does **less** in the sense of not including a templating language (use [`@radically-straightforward/html`](https://github.com/radically-straightforward/radically-straightforward/tree/main/html) instead), having a more simpler router, and so forth. It does **more** in the sense of parsing requests including file uploads, Live Connections, CSRF protection, and so forth.

Also, `@radically-straightforward/server` follows a more didactic approach. It avoids Embedded Domain-Specific Languages (eDSL) (for example, Express’s `.get("/")`), in favor of a more explicit and flexible approach.

### Live Connection

- <https://hotwired.dev/>
- <https://github.com/phoenixframework/phoenix_live_view>

Live Connections were inspired by the projects above, but it’s conceptually simpler—it boils down to keeping a connection alive and re-running `request` and `response` through the application when an update is necessary.

We expect that Live Connections are interoperable in the sense that other libraries and frameworks, even those implemented in other programming languages, may implement a similar idea.

### Server-Sent Events

- <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events>

The way Live Connections work is very similar (and inspired) by the stock browser functionality called Server-Sent Events. What sets them apart are:

- We have more control over the HTTP request for a Live Connection. This is useful, for example, to include the `Live-Connection` HTTP header which identifies the original request and allows the server to avoid a redundant update as soon as the connection is established.

- In Live Connection updates we use [JSON lines](https://jsonlines.org/) instead of the more obscure `text/event-stream` format.

- We may see more HTTP features being available in Live Connections, whereas Server-Sent Events probably won’t see many improvements moving forward because it seems to be a low priority for browser developers. See <https://github.com/whatwg/html/issues/2177>.

- We have observed some edge cases in which the Server-Sent Events connection was closed and not retried, while Live Connections retries are more reliable.

### Image/Video/Audio Proxy

- <https://github.com/atmos/camo>
- <https://github.com/imgproxy/imgproxy>
- <https://github.com/willnorris/imageproxy>
- <https://github.com/http-party/node-http-proxy>
- <https://github.com/chimurai/http-proxy-middleware>
- <https://github.com/cookpad/ecamo>
- <https://github.com/weserv/images>
- <https://github.com/jpmckinney/image-proxy>
- <https://github.com/sdepold/node-imageable>
- <https://github.com/marcjacobs1021/node-image-proxy>

The projects above, particularly camo, were the inspiration for this feature. The differences are:

- It’s a feature of the server library, instead of being a separate service to manage.

- It’s simpler: It doesn’t implement a image resizer, video re-encoder, cache, and so forth.

- It doesn’t support HMAC to guarantee that the requests came from the same origin and prevent abuse. Instead, it relies on a [Cross-Origin Resource Policy](https://github.com/radically-straightforward/radically-straightforward/tree/main/caddy#application) which prevents proxied content from being embedded in third-party websites.
