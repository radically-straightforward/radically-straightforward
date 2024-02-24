import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import server from "@radically-straightforward/server";

test(async () => {
  const application = server(18000);

  let counter = 0;

  application.push({
    method: "PATCH",
    pathname: /^\/request-parsing\/(?<pathnameParameter>[0-9]+)$/,
    handler: async (request: any, response: any) => {
      for (const values of Object.values<any>(request.body))
        if (Array.isArray(values))
          for (const value of values)
            if (typeof value.path === "string") {
              value.content = [...(await fs.readFile(value.path))];
              delete value.path;
            }
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(
        JSON.stringify({
          pathname: request.pathname,
          search: request.search,
          headers: { "custom-header": request.headers["custom-header"] },
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
      "http://localhost:18000/request-parsing/10?searchParameter=20",
      {
        method: "PATCH",
        headers: {
          "Custom-Header": "Hello",
          Cookie: "__Host-example=abc; __Host-anotherExample=def",
        },
        body: new URLSearchParams({ bodyField: "33" }),
      },
    );
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json; charset=utf-8",
    );
    assert.deepEqual(await response.json(), {
      pathname: { pathnameParameter: "10" },
      search: { searchParameter: "20" },
      headers: { "custom-header": "Hello" },
      cookies: { example: "abc", anotherExample: "def" },
      body: { bodyField: "33" },
    });
    assert.equal(counter, 1);
  }

  {
    const requestBody = new FormData();
    requestBody.append("bodyFields[]", "33");
    requestBody.append("bodyFields[]", "34");
    requestBody.append(
      "bodyFileFields[]",
      new Blob([Buffer.from([33, 34, 3])]),
    );
    requestBody.append(
      "bodyFileFields[]",
      new Blob([Buffer.from([133, 134, 13])]),
    );
    assert.deepEqual(
      await (
        await fetch("http://localhost:18000/request-parsing/10", {
          method: "PATCH",
          body: requestBody,
        })
      ).json(),
      {
        pathname: { pathnameParameter: "10" },
        search: {},
        headers: {},
        cookies: {},
        body: {
          bodyFields: ["33", "34"],
          bodyFileFields: [
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

  application.push({
    method: "GET",
    pathname: "/response-helpers",
    handler: (request: any, response: any) => {
      response.setCookie("example", "abc");
      response.setCookie("anotherExample", "def");
      assert.equal(request.cookies.example, "abc");
      response.end();
    },
  });

  {
    const response = await fetch("http://localhost:18000/response-helpers");
    assert.deepEqual(response.headers.getSetCookie(), [
      "__Host-example=abc; Max-Age=12960000; Domain=localhost; Path=/; Secure; HttpOnly; SameSite=Lax; Partitioned",
      "__Host-anotherExample=def; Max-Age=12960000; Domain=localhost; Path=/; Secure; HttpOnly; SameSite=Lax; Partitioned",
    ]);
  }

  process.kill(process.pid);
});
