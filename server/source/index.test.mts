import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import timers from "node:timers/promises";
import server from "@radically-straightforward/server";

test({ timeout: 30 * 1000 }, async () => {
  const application = server();

  const directoriesThatShouldHaveBeenCleanedUp = new Array<string>();
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
              directoriesThatShouldHaveBeenCleanedUp.push(
                path.dirname(value.path),
              );
              delete value.path;
            }
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
      href: "http://localhost:18000/request-parsing/10?searchParameter=20",
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
        href: "http://localhost:18000/request-parsing/10",
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
    await timers.setTimeout(500);
    for (const directoryThatShouldHaveBeenCleanedUp of directoriesThatShouldHaveBeenCleanedUp)
      await assert.rejects(async () => {
        await fs.access(directoryThatShouldHaveBeenCleanedUp);
      });
  }

  {
    const response = await fetch("http://localhost:18000/", {
      headers: { Cookie: "__Host-example" },
    });
    assert.equal(response.status, 400);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Malformed ‘Cookie’ header.");
  }

  assert.equal(
    (
      await fetch("http://localhost:18000/", {
        headers: { "Custom-Header": "TOO LARGE".repeat(10_000) },
      })
    ).status,
    431,
  );

  assert.equal(
    (
      await fetch("http://localhost:18000/", {
        headers: Object.fromEntries(
          Array.from({ length: 1_000 }, (value, key) => [
            `Custom-Header-${key}`,
            "Hello",
          ]),
        ),
      })
    ).status,
    431,
  );

  {
    const response = await fetch("http://localhost:18000/", {
      method: "PATCH",
      body: new URLSearchParams({ ["bodyField".repeat(10_000)]: "33" }),
    });
    assert.equal(response.status, 413);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Field too large.");
  }

  {
    const response = await fetch("http://localhost:18000/", {
      method: "PATCH",
      body: new URLSearchParams({ bodyField: "33".repeat(1_000_000) }),
    });
    assert.equal(response.status, 413);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Field too large.");
  }

  // TODO: "File too large." (both field name and contents)

  {
    const response = await fetch("http://localhost:18000/", {
      method: "PATCH",
      body: new URLSearchParams(
        Object.fromEntries(
          Array.from({ length: 1_000 }, (value, key) => [
            `bodyField-${key}`,
            "33",
          ]),
        ),
      ),
    });
    assert.equal(response.status, 413);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Too many fields.");
  }

  // TODO: "Too many files."

  application.push({
    method: "GET",
    pathname: "/response-helpers",
    handler: (request: any, response: any) => {
      response.state.example = "Hello";
    },
  });

  application.push({
    method: "GET",
    pathname: "/response-helpers",
    handler: (request: any, response: any) => {
      assert.equal(response.state.example, "Hello");
      assert.equal(request.cookies.example, undefined);
      assert.equal(request.cookies.anotherExample, undefined);
      response.setCookie("example", "abc");
      response.setCookie("anotherExample", "def");
      assert.equal(request.cookies.example, "abc");
      assert.equal(request.cookies.anotherExample, "def");
      response.deleteCookie("anotherExample");
      assert.equal(request.cookies.anotherExample, undefined);
      response.redirect("/redirect");
    },
  });

  application.push({
    method: "GET",
    pathname: "/response-helpers",
    handler: (request: any, response: any) => {
      assert.fail();
    },
  });

  {
    const response = await fetch("http://localhost:18000/response-helpers", {
      redirect: "manual",
    });
    assert.equal(response.status, 303);
    assert.equal(
      response.headers.get("Location"),
      "http://localhost:18000/redirect",
    );
    assert.deepEqual(response.headers.getSetCookie(), [
      "__Host-example=abc; Max-Age=12960000; Path=/; Secure; HttpOnly; SameSite=None",
      "__Host-anotherExample=def; Max-Age=12960000; Path=/; Secure; HttpOnly; SameSite=None",
      "__Host-anotherExample=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None",
    ]);
  }

  {
    const trace = new Array<string>();

    application.push({
      method: "GET",
      pathname: "/error",
      handler: (request: any, response: any) => {
        trace.push("BEFORE ERROR");
        throw new Error("ERROR");
        trace.push("AFTER ERROR");
      },
    });

    application.push({
      method: "GET",
      pathname: "/error",
      handler: (request: any, response: any) => {
        trace.push("UNREACHABLE HANDLER");
      },
    });

    application.push({
      error: true,
      handler: (request: any, response: any) => {
        trace.push("REACHABLE ERROR HANDLER");
        trace.push(response.error.message);
        response.statusCode = 422;
        response.end();
      },
    });

    application.push({
      error: true,
      handler: (request: any, response: any) => {
        trace.push("UNREACHABLE ERROR HANDLER");
      },
    });

    assert.equal((await fetch("http://localhost:18000/error")).status, 422);
    assert.deepEqual(trace, [
      "BEFORE ERROR",
      "REACHABLE ERROR HANDLER",
      "ERROR",
    ]);
  }

  {
    const response = await fetch("http://localhost:18000/unhandled");
    assert.equal(response.status, 500);
    assert.equal(
      await response.text(),
      "The application didn’t finish handling this request.",
    );
  }

  process.kill(process.pid);
});
