# Radically Straightforward · Server

**🦾 HTTP server in Node.js**

## Installation

```console
$ npm install @radically-straightforward/server
```

## Usage

TODO

## Requirements

- Live Connection
  - Tests
- Types
  - Request & response types
  - Address all `any`s

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
- Request timeout (HTTP status 408) (https://nodejs.org/dist/latest-v21.x/docs/api/http.html#serverrequesttimeout)
  - Headers: `createServer()`’s `headersTimeout` (default: `60000`)
  - Body: `createServer()`’s `requestTimeout` (default: `300000`)
- CSRF protection
  - Don’t let `GET` routes have side-effects
  - Make non-`GET` requests with custom header (`CSRF-Protection`)
  - References
    - <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
- Images/videos/audios proxy.
- Persistent Connection.
  - Features
    - Detect that you’re offline.
    - Update when there’s a new version of the page.
    - Reload in development.
    - Detect a server version update.
  - Requirements
    - Sticky load balancer, because we keep state on the server (which is simpler than the SQLite approach necessary for sharing state between processes)
    - `GET` requests
    - Don’t send headers

## Related Work

- <https://expressjs.com/>
- <https://fastify.dev/>
- <https://koajs.com/>
- <https://hono.dev/>
- <https://routup.net/>
- <https://itty.dev/itty-router>
- <https://github.com/lukeed/worktop>
