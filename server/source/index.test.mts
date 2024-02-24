import test from "node:test";
import assert from "node:assert/strict";
import server from "@radically-straightforward/server";

test(async () => {
  const application = server(18000);

  let requestsCount = 0;

  application.push({
    method: "PATCH",
    pathname: /^\/conversations\/(?<conversationId>[0-9]+)$/,
    handler: (request: any, response: any) => {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          pathname: request.pathname,
          search: request.search,
          headers: { "a-custom-header": request.headers["a-custom-header"] },
          cookies: request.cookies,
          body: request.body,
        }),
      );
      response.afters.push(() => {
        requestsCount++;
      });
    },
  });

  const response = await fetch(
    "http://localhost:18000/conversations/10?name=leandro",
    {
      method: "PATCH",
      headers: {
        "A-Custom-Header": "Hello",
        Cookie: "session=abc; colorScheme=dark",
      },
      body: new URLSearchParams({ age: "33" }),
    },
  );
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.deepEqual(await response.json(), {
    pathname: { conversationId: "10" },
    search: { name: "leandro" },
    headers: { "a-custom-header": "Hello" },
    cookies: { session: "abc", colorScheme: "dark" },
    body: { age: "33" },
  });
  assert.equal(requestsCount, 1);

  process.kill(process.pid);
});
