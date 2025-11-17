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
        { cookieExample1: string; cookieExample2: string },
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
      assert.deepEqual(request.cookies, {
        cookieExample1: "5",
        cookieExample2: "6",
      });
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
          Cookie: "__Host-cookieExample1=5; __Host-cookieExample2=6",
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
          bodyStringExample: string;
          bodyFileExample: serverTypes.RequestBodyFile;
          bodyArrayExample: serverTypes.RequestBodyFile[];
        },
        {}
      >,
      response,
    ) => {
      assert.equal(request.body.bodyStringExample, "1");
      assert(request.body.bodyFileExample);
      assert.equal(request.body.bodyFileExample.encoding, "7bit");
      assert.equal(
        request.body.bodyFileExample.mimeType,
        "application/octet-stream",
      );
      assert.equal(request.body.bodyFileExample.filename, "blob");
      assert.deepEqual(
        [...(await fs.readFile(request.body.bodyFileExample.path))],
        [2],
      );
      assert(request.body.bodyArrayExample);
      assert.deepEqual(
        [...(await fs.readFile(request.body.bodyArrayExample[0].path))],
        [3],
      );
      assert.deepEqual(
        [...(await fs.readFile(request.body.bodyArrayExample[1].path))],
        [4],
      );
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify(request.body.bodyFileExample.path));
    },
  });
  {
    const requestBody = new FormData();
    requestBody.append("bodyStringExample", "1");
    requestBody.append("bodyFileExample", new Blob([Buffer.from([2])]));
    requestBody.append("bodyArrayExample[]", new Blob([Buffer.from([3])]));
    requestBody.append("bodyArrayExample[]", new Blob([Buffer.from([4])]));
    const response = await fetch(
      "http://localhost:18000/request-parsing/files",
      {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: requestBody,
      },
    );
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json; charset=utf-8",
    );
    const temporaryFile = await response.json();
    await timers.setTimeout(500);
    await assert.rejects(async () => {
      await fs.access(temporaryFile);
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
  {
    const response = await fetch("http://localhost:18000/", {
      headers: { Cookie: "__Host-cookieExample" },
    });
    assert.equal(response.status, 400);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Error: Malformed ‘Cookie’ header.");
  }
  if (process.platform !== "win32") {
    {
      const response = await fetch("http://localhost:18000/", {
        headers: { ["Example-Header".repeat(10_000)]: "TOO LARGE" },
      });
      assert.equal(response.status, 431);
    }
    {
      const response = await fetch("http://localhost:18000/", {
        headers: { "Example-Header": "TOO LARGE".repeat(10_000) },
      });
      assert.equal(response.status, 431);
    }
    {
      const response = await fetch("http://localhost:18000/", {
        headers: Object.fromEntries(
          Array.from({ length: 1000 }, (value, key) => [
            `Example-Header--${key}`,
            "TOO MANY HEADERS",
          ]),
        ),
      });
      assert.equal(response.status, 431);
    }
    {
      const response = await fetch("http://localhost:18000/", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams({
          ["bodyStringExample".repeat(10_000)]: "1",
        }),
      });
      assert.equal(response.status, 413);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "Error: Field too large.");
    }
    {
      const response = await fetch("http://localhost:18000/", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams({
          bodyStringExample: "1".repeat(10_000_000),
        }),
      });
      assert.equal(response.status, 413);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "Error: Field too large.");
    }
    {
      const response = await fetch("http://localhost:18000/", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams(
          Object.fromEntries(
            Array.from({ length: 1000 }, (value, key) => [
              `bodyStringExample--${key}`,
              "1",
            ]),
          ),
        ),
      });
      assert.equal(response.status, 413);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "Error: Too many fields.");
    }
    {
      const requestBody = new FormData();
      requestBody.append(
        "bodyFileExample".repeat(100_000),
        new Blob([Buffer.from([1])]),
      );
      const response = await fetch("http://localhost:18000/", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: requestBody,
      });
      assert.equal(response.status, 400);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "Error: Malformed part header");
    }
    {
      const requestBody = new FormData();
      requestBody.append(
        "bodyFileExample",
        new Blob([Buffer.alloc(100_000_000)]),
      );
      const response = await fetch("http://localhost:18000/", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: requestBody,
      });
      assert.equal(response.status, 413);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "Error: File too large.");
    }
    {
      const requestBody = new FormData();
      for (
        let bodyFileExampleCount = 0;
        bodyFileExampleCount < 1000;
        bodyFileExampleCount++
      )
        requestBody.append(
          `bodyFileExample--${bodyFileExampleCount}`,
          new Blob([Buffer.from([1])]),
        );
      const response = await fetch("http://localhost:18000/", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: requestBody,
      });
      assert.equal(response.status, 413);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "Error: Too many files.");
    }
  }
  {
    application.push({
      method: "GET",
      pathname: "/flash",
      handler: (request, response) => {
        response.end(request.getFlash?.() ?? "No flash");
      },
    });
    application.push({
      method: "POST",
      pathname: "/flash",
      handler: (request, response) => {
        response.setFlash?.("Yes flash");
        response.redirect?.();
      },
    });
    assert.equal(
      await (await fetch("http://localhost:18000/flash")).text(),
      "No flash",
    );
    const response = await fetch("http://localhost:18000/flash", {
      redirect: "manual",
      method: "POST",
      headers: { "CSRF-Protection": "true" },
    });
    assert.equal(
      await (
        await fetch("http://localhost:18000/flash", {
          headers: {
            Cookie: response.headers.get("Set-Cookie")!.split(";")[0],
          },
        })
      ).text(),
      "Yes flash",
    );
  }
  application.push({
    method: "GET",
    pathname: "/basic",
    handler: (request, response) => {
      response.end("<p>Hello World</p>");
    },
  });
  {
    const response = await fetch("http://localhost:18000/basic");
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/html; charset=utf-8",
    );
    assert.equal(await response.text(), "<p>Hello World</p>");
  }
  node.exit();
});
