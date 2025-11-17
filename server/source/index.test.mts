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
    pathname: new RegExp("^/request-parsing/basic(?:$|/)"),
    handler: (
      request: serverTypes.Request<{}, {}, {}, {}, { stateExample: string }>,
      response,
    ) => {
      request.state.stateExample = "10";
    },
  });
  application.push({
    method: "POST",
    pathname: new RegExp("^/request-parsing/basic/(?<pathnameExample>[0-9]+)$"),
    handler: (
      request: serverTypes.Request<
        { pathnameExample: string },
        { searchStringExample: string; searchArrayExample: string[] },
        { cookie1: string; cookie2: string },
        { bodyStringExample: string; bodyArrayExample: string[] },
        { stateExample: string }
      >,
      response,
    ) => {
      assert.deepEqual(request.pathname, { pathnameExample: "1" });
      // @ts-expect-error
      request.pathname.nonexisting;
      assert.deepEqual(request.search, {
        searchStringExample: "2",
        searchArrayExample: ["3", "4"],
      });
      // @ts-expect-error
      request.search.nonexisting;
      assert.deepEqual(request.cookies, { cookie1: "5", cookie2: "6" });
      // @ts-expect-error
      request.cookies.nonexisting;
      assert.deepEqual(request.body, {
        bodyStringExample: "7",
        bodyArrayExample: ["8", "9"],
      });
      // @ts-expect-error
      request.body.nonexisting;
      assert.deepEqual(request.state, { stateExample: "10" });
      // @ts-expect-error
      request.state.nonexisting;
      assert.equal(request.headers["header-example"], "11");
      response.end();
    },
  });
  {
    const response = await fetch(
      `http://localhost:18000/request-parsing/basic/1?${new URLSearchParams([
        ["searchStringExample", "2"],
        ["searchArrayExample[]", "3"],
        ["searchArrayExample[]", "4"],
      ]).toString()}`,
      {
        method: "POST",
        headers: {
          "CSRF-Protection": "true",
          Cookie: "__Host-cookie1=5; __Host-cookie2=6",
          "Header-Example": "11",
        },
        body: new URLSearchParams([
          ["bodyStringExample", "7"],
          ["bodyArrayExample[]", "8"],
          ["bodyArrayExample[]", "9"],
        ]),
      },
    );
    assert.equal(response.status, 200);
  }
  application.push({
    method: "POST",
    pathname: "/request-parsing/files",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          bodyFileExample: serverTypes.RequestBodyFile;
          bodyArrayExample: serverTypes.RequestBodyFile[];
        },
        {}
      >,
      response,
    ) => {
      assert(request.body.bodyFileExample);
      assert.equal(request.body.bodyFileExample.encoding, "7bit");
      assert.equal(
        request.body.bodyFileExample.mimeType,
        "application/octet-stream",
      );
      assert.equal(request.body.bodyFileExample.filename, "blob");
      assert.deepEqual(
        [...(await fs.readFile(request.body.bodyFileExample.path))],
        [1],
      );
      assert(request.body.bodyArrayExample);
      assert.deepEqual(
        [...(await fs.readFile(request.body.bodyArrayExample[0].path))],
        [2],
      );
      assert.deepEqual(
        [...(await fs.readFile(request.body.bodyArrayExample[1].path))],
        [3],
      );
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(request.body.bodyFileExample.path);
    },
  });
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
