# Radically Straightforward · Server

**🦾 HTTP server in Node.js**

## Installation

```console
$ npm install @radically-straightforward/server
```

## Usage

TODO

## Requirements

- Response helpers:
  - Cookies.
    - `encodeURIComponent`
  - Set headers.
  - Redirect.
  - Body.
    - `Content-Type`
      - `node:util`’s `MIMEType`
    - `Content-Length`?
      - `Buffer.byteLength()`
  - Stream.
  - Locals to build response over multiple handlers.
- Handlers
  - Stop calling handlers once response is sent
  - Error handlers.
  - Detect 404.
- Logging
- Live updates.
- Missing stuff from:
  - Koa
  - Express
- Content proxy (we already have one in Courselore using Got—try to develop one using `fetch`)
  - Link in documentation for `@radically-straightforward/caddy`’s `header()`.
- Types
  - Request & response types
  - Address all `any`s
- Future:
  - Pass `pathname` parameters through `decodeURIComponent`?
  - Request body edge cases
    - Size limits (HTTP status 413)
      - Number of headers
      - Size of header
      - Number of body fields
      - Size of body field
    - Request timeout (HTTP status 408) (https://nodejs.org/dist/latest-v21.x/docs/api/http.html#serverrequesttimeout)
      - Deal with this in Caddy?
      - Headers
      - Body
    - Different charsets?
    - `Content-Encoding` (for example, compression)
  - Route based on other aspects of request, for example, `search`?

## Features

- Always listen on `localhost`, because you should be using Caddy as reverse proxy.
- Graceful termination.
- Parse pathname parameters, query parameters, headers, and request body.
- Trusts reverse proxy, because it’s meant to be used with Caddy.
- Doesn’t serve static files, because it’s meant to be used with Caddy.
- Handlers infrastructure:
  - Register functions to run after.

## Related Work

- <https://fastify.dev/>
- <https://koajs.com/>
- <https://hono.dev/>
- <https://routup.net/>
- <https://itty.dev/itty-router>
- <https://github.com/lukeed/worktop>
