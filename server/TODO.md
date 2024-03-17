# TODO

## Router

- Use Node.js `http.createServer()`’s options `IncomingMessage` and `ServerResponse` instead of ad-hoc extending the `request` and `response` objects? (https://stackoverflow.com/questions/70034891/extending-http-incomingmessage-and-http-serverresponse-providing-it-to-the-htt)
- Route based on other aspects of request, for example, `search`?

## Request Parsing

- Pass `pathname` parameters through `decodeURIComponent`?
- In the case of a request with a file that is too big, the server may not stop writing the file to the filesystem early enough, abusing the server resources (for example, disk).
- Different charsets?
- `Content-Encoding` (for example, compression)?

## Response Helpers

- Do we really don’t have to worry about `Content-Length`?
  - Node.js already sets `Content-Length` if you use `end()`. If you use `write()` Node.js sets chunked transfer.
  - If necessary we could use `Buffer.byteLength()` to determine the `Content-Length`

## Live Connection

- Don’t traverse the set of connections: Index by `request.id` and by `request.URL.pathname` (with hierarchical indexing, similar to proposal for `utilities.intern`)

## Image/Video/Audio Proxy

- Edge cases
  - Test redirect loop
  - Test timeout 10s
  - Limit size?
- Range requests?
- Resize images?
- Cache? Not only for performance, but also because third-party images may go away
- Include HMAC?
  - Perhaps not, because as far as I understand the purpose of HMAC is to prevent abuse, but hotlinked images can only be used from our website anyway due to Cross-Origin-Resource-Policy. In other words, you can’t hotlink a hotlinked (proxied) image. This saves us from having to compute & verify HMACs.

## CSRF Protection

- Currently we’re defending from CSRF by requiring a custom header. This is the simplest protection mechanism, but it’s vulnerable to broken environments that let cross-site requests include custom headers (for example, old versions of Flash).
- [Synchronizer tokens](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern) are the most secure option.
  - Communicate the token to the server with the custom header (`CSRF-Protection`), combining the synchronizer token with the custom header approach.
  - Let the synchronizer tokens be session-wide, not specific per page, so as to not break the browser “Back” button.
  - Couple the synchronizer token to the user session.
  - Have pre-sessions with synchronizer tokens for signed out users to protect against login CSRF.
- In case the implementation of the synchronizer token doesn’t go well, try to use the [double-submit pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#alternative-using-a-double-submit-cookie-pattern).
  - It requires a secret known by the server to implement most securely. Note how everything boils down to the server recognizing itself by seeing a secret piece of data that it created.

## Convenient Defaults

- Rate limiting
  - Could be done on Caddy with extension
