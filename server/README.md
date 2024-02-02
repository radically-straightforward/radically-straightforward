## Requirements

- Handlers infrastructure.
  - `next` (Koa).
  - Register functions to run after.
- Parse request:
  - Path parameters (`decodeURIComponent`).
  - Query parameters (`URLSearchParams`) (<https://www.npmjs.com/package/qs>).
  - Cookies.
  - Body.
    - Form (`application/x-www-form-urlencoded`) (`URLSearchParams`).
    - Attachments (`multipart/form-data`).
- Response helpers:
  - Use data returned by handler to control response.
  - Cookies.
  - Set headers.
  - Redirect.
  - Body.
    - `Content-Type`
    - `Content-Length`?
  - Stream.
  - Locals to build response over multiple handlers.
- Route based on several aspects of request.
- Allow multiple handlers to handle the same request.
  - Have functions that run after the response.
- Async handlers.
- Error handlers.
- Terminate responses gracefully.
  - Error in case response isn’t terminated.
- Logging:
  - `X-Forwarded-Host`
- Live updates.
- Missing stuff from:
  - Koa
  - Express

## Related Work

- <https://fastify.dev/>
- <https://koajs.com/>
- <https://hono.dev/>
- <https://routup.net/>
- <https://itty.dev/itty-router>
- <https://github.com/lukeed/worktop>
