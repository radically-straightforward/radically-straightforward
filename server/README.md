# Radically Straightforward · Server

**🦾 HTTP server in Node.js**

## Installation

```console
$ npm install @radically-straightforward/server
```

## Usage

```typescript
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `Route`

```typescript
export type Route = {
  method?: string | RegExp;
  pathname?: string | RegExp;
  error?: boolean;
  handler: (
    request: Request<{}, {}, {}, {}, {}>,
    response: Response,
  ) => void | Promise<void>;
};
```

A `Route` is a combination of some conditions that the request must satisfy for the `handler` to be called, and the `handler` that produces a response. An application is an Array of `Route`s.

**`method`:** The HTTP request method, for example `"GET"` or `/^PATCH|PUT$/`.

**`pathname`:** The [`pathname`](https://nodejs.org/api/url.html#url-strings-and-url-objects) part of the HTTP request. [Named capturing groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Groups_and_backreferences) are available in the `handler` under `request.pathname`, for example, given `pathname: new RegExp("^/conversations/(?<conversationId>[0-9]+)$")`, the `conversationId` is available at `request.pathname.conversationId`.

**`error`:** Indicates that this `handler` should only be called if a previous `handler` threw an exception.

**`handler`:** The function that produces the response. It’s similar to a function that you’d provide to [`http.createServer()`](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) as a `requestListener`, with two differences: 1. The `handler` is called only if the request satisfies the conditions above; and 2. The `request` and `response` parameters are extended with extra functionality (see `Request` and `Response`). The `handler` may be synchronous or asynchronous.

### `Request`

```typescript
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
    error?: unknown;
    liveConnection?: RequestLiveConnection;
  };
```

An extension of [Node.js’s `http.IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage) with the following extra functionality:

**`id`:** A unique request identifier.

**`start`:** A timestamp of when the request arrived.

**`log`:** A logging function which includes information about the request and formats the message with [`@radically-straightforward/utilities`’s `log()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities#log).

**`ip`:** The IP address of the request originator as reported by [Caddy](https://github.com/radically-straightforward/radically-straightforward/tree/main/caddy) (the reverse proxy) (uses the `X-Forwarded-For` HTTP request header).

**`URL`:** The [`request.url`](https://nodejs.org/api/http.html#messageurl) parsed into a [`URL` object](https://developer.mozilla.org/en-US/docs/Web/API/URL), including the appropriate protocol (uses the `X-Forwarded-Proto` HTTP request header) and host (uses the `X-Forwarded-Host` or the `Host` HTTP request header) as reported by Caddy.

**`pathname`:** The variable parts of the [`pathname` part of the `URL`](https://nodejs.org/api/url.html#url-strings-and-url-objects), as defined in the named capturing groups of the regular expression from the `route`’s `pathname`. Note that this depends on user input, so it’s important to validate explicitly (the generic `Pathname` in TypeScript is `Partial<>` to encourage you to perform these validations).

**`search`:** The [`search` part of the `URL`](https://nodejs.org/api/url.html#url-strings-and-url-objects) parsed into an object. Note that this depends on user input, so it’s important to validate explicitly (the generic `Search` in TypeScript is `Partial<>` to encourage you to perform these validations).

**`cookies`:** The cookies sent via the `Cookie` header parsed into an object. Note that this depends on user input, so it’s important to validate explicitly (the generic `Cookies` in TypeScript is `Partial<>` to encourage you to perform these validations).

**`body`:** The request body parsed into an object. Uses [busboy](https://www.npmjs.com/package/busboy). It supports `Content-Type`s `application/x-www-form-urlencoded` (the default type of form submission in browsers) and `multipart/form-data` (used for uploading files). Form fields become strings, and files become `RequestBodyFile` objects. The files are saved to disk in a temporary directory and deleted after the response is sent—if you wish to keep the files you must move them to a permanent location. If a field name ends in `[]`, for example, `colors[]`, then multiple occurrences of the same field are captured into an array—this is useful for `<input type="checkbox" />`s with the same `name`, and for uploading multiple files. Note that this depends on user input, so it’s important to validate explicitly (the generic `Body` in TypeScript is `Partial<>` to encourage you to perform these validations).

**`state`:** An object to communicate state across multiple `handler`s that handle the same request, for example, a handler may authenticate a user and set a `request.state.user` property for subsequent `handler`s to use. Note that the generic `State` in TypeScript is `Partial<>` because the state may not be set depending on which `handler`s ran previously—you may either use runtime checks that the expected `state` is set, or use, for example, `request.state.user!` if you’re sure that the state is set by other means.

**`error:`** In error handlers, this is the error that was thrown.

**`liveConnection:`** If this is a Live Connection, then this property is set to a `RequestLiveConnection` containing more information about the state of the Live Connection.

### `RequestBodyFile`

```typescript
export type RequestBodyFile = busboy.FileInfo & {
  path: string;
};
```

A type that may appear under elements of `request.body` which includes information about the file that was uploaded and the `path` in a temporary directory where you may find the file. The files are deleted after the response is sent—if you wish to keep them you must move them to a permanent location.

### `RequestLiveConnection`

```typescript
export type RequestLiveConnection = {
  establish?: boolean;
  skipUpdateOnEstablish?: boolean;
};
```

Information about a Live Connection that is available under `request.liveConnection`.

**`establish`:** Whether the connection is just being established. In other words, whether it’s the first time that the `handler`s are being called for this request. You may use this, for example, to start a [`backgroundJob()`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities#backgroundjob) which updates a timestamp of when a user has last been seen online.

**`skipUpdateOnEstablish`:** Whether it’s necessary to send an update with a new version of the page upon establishing the Live Connection. An update may be skipped if the page hasn’t been marked as modified since the last update was sent. You must only check this variable if `establish` is `true`.

### `Response`

```typescript
export type Response = http.ServerResponse & {
  setCookie: (key: string, value: string, maxAge?: number) => Response;
  deleteCookie: (key: string) => Response;
  redirect: (
    destination?: string,
    type?: "see-other" | "temporary" | "permanent",
  ) => Response;
};
```

An extension of [Node.js’s `http.ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) with the following extra functionality:

> **Note:** The extra functionality is only available in requests that are **not** Live Connections, because Live Connections must not set headers.

**`setCookie`:** Sets a [`Set-Cookie` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) with secure settings. Also updates the `request.cookies` object so that the new cookies are visible from within the request itself.

**`deleteCookie`:** Sets an expired [`Set-Cookie` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) without a value and with the same secure settings used by `setCookie`. Also updates the `request.cookies` object so that the new cookies are visible from within the request itself.

**`redirect`:** Sends the [`Location` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location) and an HTTP status of [303 (`"see-other"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303) (default), [307 (`"temporary"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/307), or [308 (`"permanent"`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/308). Note that there are no options for the legacy statuses of [301](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301) and [302](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302), because they may lead some clients to change the HTTP method of the redirected request by mistake.

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

An extension of [Node.js’s `http.createServer()`](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) which provides all the extra functionality of `@radically-straightforward/server`. Refer to the `README` for more information.

**`port`:** A port number for the server. By default it’s `18000`, which is well out of the range of most applications to avoid collisions.

**`csrfProtectionExceptionPathname`:** Exceptions for the CSRF prevention mechanism. This may be, for example, `new RegExp("^/saml/(?:assertion-consumer-service|single-logout-service)$")` for applications that work as SAML Service Providers which include routes for Assertion Consumer Service (ACS) and Single Logout (SLO), because the Identity Provider makes the browser send these requests as cross-origin `POST`s (but SAML includes other mechanisms to prevent CSRF in these situations).

<!-- DOCUMENTATION END: ./source/index.mts -->

## Features

- Always listen on `localhost`, because you should be using Caddy as reverse proxy.
- Graceful termination.
- Parse pathname parameters, query parameters, headers, and request body.
- Trusts reverse proxy, because it’s meant to be used with Caddy.
- Doesn’t serve static files, because it’s meant to be used with Caddy.
- Cookies:
  - `SameSite=None` for SAML to work, because the Identity Provider sends a `POST` request with the assertions back to the Service Provider, and anything other than `SameSite=None` would prevent cookies from being sent, and the server wouldn’t be able to ascertain whether a session already exists.
  - Expects the server to be available under a single `hostname`, which is fair, because it’s meant to be used with Caddy.
  - Don’t use the `Domain` option, because the default is to associate the cookie only with the current domain, and if you set the option, the cookie applies to subdomains as well. (https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- Compared to Express.js
  - No need for `next()`, no requests left unresponded.
  - Async handlers 😅
- Request size limits (HTTP status 431 (headers) (Node.js) and 413 (body) (busboy (in the way we use it)))
- Request timeout (HTTP status 408) (https://nodejs.org/api/http.html#serverrequesttimeout)
  - Headers: `createServer()`’s `headersTimeout` (default: `60000`)
  - Body: `createServer()`’s `requestTimeout` (default: `300000`)
- CSRF protection
  - Don’t let `GET` routes have side-effects
  - Make non-`GET` requests with custom header (`CSRF-Protection`)
  - References
    - <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
- Images/videos/audios proxy.
- Live Connection.
  - Features
    - Detect that you’re offline.
    - Update when there’s a new version of the page.
    - Reload in development.
    - Detect a server version update.
  - Requirements
    - Sticky load balancer, because we keep state on the server (which is simpler than the SQLite approach necessary for sharing state between processes)
    - `GET` requests
    - Don’t send headers

## Future

- Use Node.js `http.createServer()`’s options `IncomingMessage` and `ServerResponse` instead of ad-hoc extending the `request` and `response` objects? (https://stackoverflow.com/questions/70034891/extending-http-incomingmessage-and-http-serverresponse-providing-it-to-the-htt)
- Route based on other aspects of request, for example, `search`?
- Pass `pathname` parameters through `decodeURIComponent`?
- Response body `Content-Length`?
  - Node.js already sets `Content-Length` if you use `end()`. If you use `write()` Node.js sets chunked transfer.
  - `Buffer.byteLength()`
- CSRF
  - Currently we’re defending from CSRF with a [custom header](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#use-of-custom-request-headers) (`CSRF-Protection`). This is the simplest viable protection, but it’s vulnerable to broken environments that let cross-site requests include custom headers (for example, an old version of Flash).
  - [Synchronizer tokens](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern) are the most secure option.
    - Communicate the token to the server with the custom header (`CSRF-Protection`), combining the synchronizer token with the custom header approach.
    - Let the synchronizer tokens be session-wide, not specific per page, so as to not break the browser “Back” button.
    - Couple the synchronizer token to the user session.
    - Have pre-sessions with synchronizer tokens for signed out users to protect against login CSRF.
  - In case the implementation of the synchronizer token doesn’t go well, try to use the [double-submit pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie).
    - It requires a secret known by the server to implement most securely. Note how everything boils down to the server recognizing itself by seeing a secret piece of data that it created.
- Rate limiting
  - Could be done on Caddy with extension
- Edge cases
  - In the case of a request with a file that is too big, the server may not stop writing the file to the filesystem early enough, abusing the user of resources (for example, disk).
  - Different charsets?
  - `Content-Encoding` (for example, compression)
- Proxy
  - Edge cases
    - Test redirect loop
    - Test timeout 10s
    - Limit size?
  - Range requests?
  - Resize images?
  - Cache? Not only for performance, but also because third-party images may go away
  - Include HMAC?
    - Perhaps not, because as far as I understand the purpose of HMAC is to prevent abuse, but hotlinked images can only be used from our website anyway due to Cross-Origin-Resource-Policy. In other words, you can’t hotlink a hotlinked (proxied) image. This saves us from having to compute & verify HMACs.
  - Allow third-parties to hotlink from our proxy? This has implications on the decision to not use HMAC on the proxy, and also has implications on rendering hotlinked images on third-party websites, for example, the Outlook email client, as soon as we start sending email notifications with fully processed content (right now we send the pre-processed content, but we want to change that so that things like `@mentions` show up more properly.)
    - This is necessary to 100% guarantee that people will be able to see images on Outlook
- Live Connection
  - Don’t traverse the set of connections: Index by `request.id` and by `request.URL.pathname` (with hierarchical indexing, similar to proposal for `utilities.intern`)

## Related Work

- <https://expressjs.com/>
- <https://fastify.dev/>
- <https://koajs.com/>
- <https://hono.dev/>
- <https://routup.net/>
- <https://itty.dev/itty-router>
- <https://github.com/lukeed/worktop>
