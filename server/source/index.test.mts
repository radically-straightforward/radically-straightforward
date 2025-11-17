import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import timers from "node:timers/promises";
import * as node from "@radically-straightforward/node";
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";

if (!process.stdin.isTTY)
  setTimeout(() => {
    process.exit(1);
  }, 60 * 1000).unref();

test(async () => {
  const application = server();
  application.push({
    method: "POST",
    pathname: new RegExp("^/request-parsing/(?<existing>[0-9]+)$"),
    handler: async (
      request: serverTypes.Request<
        { existing: string },
        { existing: string },
        { existing: string },
        { existing: string },
        { existing: string }
      >,
      response,
    ) => {
      // @ts-expect-error
      request.pathname.nonexisting;
      // @ts-expect-error
      request.search.nonexisting;
      // @ts-expect-error
      request.cookies.nonexisting;
      // @ts-expect-error
      request.body.nonexisting;
      // @ts-expect-error
      request.state.nonexisting;
      for (const values of Object.values(request.body))
        if (Array.isArray(values))
          for (const value of values)
            if (typeof value.path === "string")
              value.content = [...(await fs.readFile(value.path))];
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(
        JSON.stringify({
          href: request.URL.href,
          pathname: request.pathname,
          search: request.search,
          headers: { "custom-header": request.headers["custom-header"] },
          cookies: request.cookies,
          body: request.body,
        }),
      );
    },
  });
  {
    const response = await fetch(
      "http://localhost:18000/request-parsing/10?searchParameter=20&searchParameterArray[]=10&searchParameterArray[]=15",
      {
        method: "POST",
        headers: {
          "CSRF-Protection": "true",
          "Custom-Header": "Hello",
          Cookie: "__Host-example=abc; __Host-anotherExample=def",
        },
        body: new URLSearchParams([
          ["bodyField", "33"],
          ["bodyFieldArray[]", "34"],
          ["bodyFieldArray[]", "35"],
        ]),
      },
    );
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json; charset=utf-8",
    );
    assert.deepEqual(await response.json(), {
      href: "http://localhost:18000/request-parsing/10?searchParameter=20&searchParameterArray[]=10&searchParameterArray[]=15",
      pathname: { pathnameParameter: "10" },
      search: { searchParameter: "20", searchParameterArray: ["10", "15"] },
      headers: { "custom-header": "Hello" },
      cookies: { example: "abc", anotherExample: "def" },
      body: { bodyField: "33", bodyFieldArray: ["34", "35"] },
    });
  }
  {
    const response = await fetch("http://localhost:18000/", {
      method: "POST",
    });
    assert.equal(response.status, 403);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(
      await response.text(),
      "Error: This request appears to have come from outside the application. Please close this tab and start again. (Cross-Site Request Forgery (CSRF) protection failed.)",
    );
  }
  node.exit();
});
