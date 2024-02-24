import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import server from "@radically-straightforward/server";

test(async () => {
  const application = server(18000);

  let counter = 0;

  application.push({
    method: "PATCH",
    pathname: /^\/conversations\/(?<conversationId>[0-9]+)$/,
    handler: async (request: any, response: any) => {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      for (const value of Object.values<any>(request.body))
        if (Array.isArray(value))
          for (const valueValue of value)
            if (typeof valueValue.path === "string") {
              valueValue.content = [...(await fs.readFile(valueValue.path))];
              delete valueValue.path;
            }
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
    requestBody.append("age[]", "33");
    requestBody.append("age[]", "34");
    requestBody.append("avatar[]", new Blob([Buffer.from([33, 34, 3])]));
    requestBody.append("avatar[]", new Blob([Buffer.from([133, 134, 13])]));
    assert.deepEqual(
      await (
        await fetch("http://localhost:18000/conversations/10", {
          method: "PATCH",
          body: requestBody,
        })
      ).json(),
      {
        pathname: { conversationId: "10" },
        search: {},
        headers: {},
        cookies: {},
        body: {
          age: ["33", "34"],
          avatar: [
            {
              encoding: "7bit",
              mimeType: "application/octet-stream",
              filename: "blob",
              content: [33, 34, 3],
            },
            {
              encoding: "7bit",
              mimeType: "application/octet-stream",
              filename: "blob",
              content: [133, 134, 13],
            },
          ],
        },
      },
    );
  }

  process.kill(process.pid);
});
