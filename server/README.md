# Radically Straightforward · Server

**🦾 HTTP server in Node.js**

## Installation

```console
$ npm install @radically-straightforward/server
```

## Usage

TODO

## Requirements

- Extra features
  - CSRF
    - Currently we’re defending from CSRF with a [custom header](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#use-of-custom-request-headers). This is the simplest viable protection, but it’s vulnerable to broken environments that let cross-site requests include custom headers (for example, an old version of Flash).
    - [Synchronizer tokens](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern) are the most secure option.
      - Communicate the token to the server with the custom header (`CSRF-Protection`), combining the synchronizer token with the custom header approach.
      - Let the synchronizer tokens be session-wide, not specific per page, so as to not break the browser “Back” button.
      - Couple the synchronizer token to the user session.
      - Have pre-sessions with synchronizer tokens for signed out users to protect against login CSRF.
    - In case the implementation of the synchronizer token doesn’t go well, try to use the [double-submit pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie).
      - It requires a secret known by the server to implement most securely. Note how everything boils down to the server recognizing itself by seeing a secret piece of data that it created.
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
  - Rate limiting
    - Could be done on Caddy with extension
  - Edge cases
    - Different charsets?
    - `Content-Encoding` (for example, compression)

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
- Request size limits (HTTP status 431 (headers) and 413 (body))
- Request timeout (HTTP status 408) (https://nodejs.org/dist/latest-v21.x/docs/api/http.html#serverrequesttimeout)
  - Headers: `createServer()`’s `headersTimeout` (default: `60000`)
  - Body: `createServer()`’s `requestTimeout` (default: `300000`)

## Related Work

- <https://expressjs.com/>
- <https://fastify.dev/>
- <https://koajs.com/>
- <https://hono.dev/>
- <https://routup.net/>
- <https://itty.dev/itty-router>
- <https://github.com/lukeed/worktop>
