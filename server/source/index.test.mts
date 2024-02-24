import test from "node:test";
import assert from "node:assert/strict";
import server from "@radically-straightforward/server";

test(async () => {
  const application = server(18000);

  let counter = 0;

  application.push({
    method: "PATCH",
    pathname: /^\/conversations\/(?<conversationId>[0-9]+)$/,
    handler: (request: any, response: any) => {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
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
        counter++;
      });
    },
  });

  {
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
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json; charset=utf-8",
    );
    assert.deepEqual(await response.json(), {
      pathname: { conversationId: "10" },
      search: { name: "leandro" },
      headers: { "a-custom-header": "Hello" },
      cookies: { session: "abc", colorScheme: "dark" },
      body: { age: "33" },
    });
    assert.equal(counter, 1);
  }

  {
    const requestBody = new FormData();
    requestBody.append("age", "33");
    requestBody.append("avatar", new Blob([Buffer.from([33, 34, 3])]));
    const responseBody = (
      await (
        await fetch("http://localhost:18000/conversations/10?name=leandro", {
          method: "PATCH",
          body: requestBody,
        })
      ).json()
    ).body;
    assert.equal(responseBody.age, "33");
    assert.equal(responseBody.avatar.encoding, "7bit");
    assert.equal(responseBody.avatar.mimeType, "application/octet-stream");
    assert.equal(responseBody.avatar.filename, "blob");
    assert.match(
      responseBody.avatar.path,
      /\/server--file--[a-zA-Z0-9]+\/blob$/,
    );
  }

  process.kill(process.pid);
});
