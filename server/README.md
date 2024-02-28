# Radically Straightforward · Server

**🦾 HTTP server in Node.js**

## Installation

```console
$ npm install @radically-straightforward/server
```

## Usage

TODO

## Requirements

- Edge cases
  - Request size limits (HTTP status 413)
    - Number of headers
    - Size of header
      - `createServer()`’s `maxHeaderSize` (default: `16384`) (This applies to a single header, and there’s no limit on the number of headers, right? Which is not what we want…)
    - Number of multipart body headers
    - Size of multipart body headers
    - Number of body fields
    - Size of body field key
    - Size of body field value
  - Request timeout (HTTP status 408) (https://nodejs.org/dist/latest-v21.x/docs/api/http.html#serverrequesttimeout)
    - Deal with this in Caddy?
    - Headers
      - `createServer()`’s `headersTimeout` (default: `60000`)
    - Body
      - `createServer()`’s `requestTimeout` (default: `300000`)
  - Decide which of these (request size limits and timeouts) should be configurable
  - Different charsets?
  - `Content-Encoding` (for example, compression)
- Extra features
  - Logging
  - Live updates.
  - Content proxy (we already have one in Courselore using Got—try to develop one using `fetch`)
    - Link in documentation for `@radically-straightforward/caddy`’s `header()`.
- Types
  - Request & response types
  - Address all `any`s
- Future
  - Use Node.js `http.createServer()`’s options `IncomingMessage` and `ServerResponse` instead of ad-hoc extending the `request` and `response` objects? (https://stackoverflow.com/questions/70034891/extending-http-incomingmessage-and-http-serverresponse-providing-it-to-the-htt)
  - Route based on other aspects of request, for example, `search`?
  - Pass `pathname` parameters through `decodeURIComponent`?
  - Response body `Content-Length`?
    - Node.js already sets `Content-Length` if you use `end()`. If you use `write()` Node.js sets chunked transfer.
    - `Buffer.byteLength()`

## Features

- Always listen on `localhost`, because you should be using Caddy as reverse proxy.
- Graceful termination.
- Parse pathname parameters, query parameters, headers, and request body.
- Trusts reverse proxy, because it’s meant to be used with Caddy.
- Doesn’t serve static files, because it’s meant to be used with Caddy.
- Handlers infrastructure:
  - Register functions to run after.
- Cookies:
  - `SameSite=None` for SAML to work, because the Identity Provider sends a `POST` request with the assertions back to the Service Provider, and anything other than `SameSite=None` would prevent cookies from being sent, and the server wouldn’t be able to ascertain whether a session already exists.
  - Expects the server to be available under a single `hostname`, which is fair, because it’s meant to be used with Caddy.
  - Don’t use the `Domain` option, because the default is to associate the cookie only with the current domain, and if you set the option, the cookie applies to subdomains as well.
- Compared to Express.js
  - No need for `next()`, no requests left unresponded.
  - Async handlers 😅

## Related Work

- <https://expressjs.com/>
- <https://fastify.dev/>
- <https://koajs.com/>
- <https://hono.dev/>
- <https://routup.net/>
- <https://itty.dev/itty-router>
- <https://github.com/lukeed/worktop>
