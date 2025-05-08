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

  {
    const response = await fetch("http://localhost:18000/", {
      method: "PATCH",
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

  const directoriesThatShouldHaveBeenCleanedUp = new Array<string>();

  application.push({
    method: "PATCH",
    pathname: new RegExp("^/request-parsing/(?<pathnameParameter>[0-9]+)$"),
    handler: async (request, response) => {
      //@ts-expect-error
      request.pathname.hi;
      //@ts-expect-error
      request.search.hi;
      //@ts-expect-error
      request.cookies.hi;
      //@ts-expect-error
      request.body.hi;
      //@ts-expect-error
      request.state.hi;

      for (const values of Object.values(request.body))
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
    },
  });

  {
    const response = await fetch(
      "http://localhost:18000/request-parsing/10?searchParameter=20&searchParameterArray[]=10&searchParameterArray[]=15",
      {
        method: "PATCH",
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
          headers: { "CSRF-Protection": "true" },
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
    assert.equal(await response.text(), "Error: Malformed ‘Cookie’ header.");
  }

  if (process.platform !== "win32") {
    assert.equal(
      (
        await fetch("http://localhost:18000/", {
          headers: { ["Custom-Header".repeat(10_000)]: "TOO LARGE" },
        })
      ).status,
      431,
    );

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
            Array.from({ length: 1000 }, (value, key) => [
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
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams({ ["bodyField".repeat(10_000)]: "33" }),
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
        method: "PATCH",
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams({ bodyField: "33".repeat(1_000_000) }),
      });
      assert.equal(response.status, 413);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "Error: Field too large.");
    }

    {
      const requestBody = new FormData();
      requestBody.append(
        "bodyFileField".repeat(10_000),
        new Blob([Buffer.from([33, 34, 3])]),
      );
      const response = await fetch("http://localhost:18000/", {
        method: "PATCH",
        headers: { "CSRF-Protection": "true" },
        body: requestBody,
      });
      assert.equal(response.status, 400);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
    }

    {
      const requestBody = new FormData();
      requestBody.append(
        "bodyFileField",
        new Blob([Buffer.alloc(100_000_000)]),
      );
      const response = await fetch("http://localhost:18000/", {
        method: "PATCH",
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
      const response = await fetch("http://localhost:18000/", {
        method: "PATCH",
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams(
          Object.fromEntries(
            Array.from({ length: 1000 }, (value, key) => [
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
      assert.equal(await response.text(), "Error: Too many fields.");
    }

    {
      const requestBody = new FormData();
      for (
        let bodyFileFieldCount = 0;
        bodyFileFieldCount < 1000;
        bodyFileFieldCount++
      )
        requestBody.append(
          "bodyFileField",
          new Blob([Buffer.from([33, 34, 3])]),
        );
      const response = await fetch("http://localhost:18000/", {
        method: "PATCH",
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
        response.end(request.getFlash() ?? "No flash");
      },
    });
    application.push({
      method: "POST",
      pathname: "/flash",
      handler: (request, response) => {
        response.setFlash("Yes flash");
        response.redirect();
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

  {
    const response = await fetch("http://localhost:18000/_health");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), null);
    assert.equal(await response.text(), "");
  }

  {
    const response = await fetch("http://localhost:18000/_proxy");
    assert.equal(response.status, 422);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(
      await response.text(),
      "Error: Missing ‘destination’ search parameter.",
    );
  }

  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent("not-a-url")}`,
    );
    assert.equal(response.status, 422);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Error: Invalid destination.");
  }

  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent("ftp://localhost")}`,
    );
    assert.equal(response.status, 422);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Error: Invalid destination.");
  }

  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent("http://localhost/")}`,
    );
    assert.equal(response.status, 422);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Error: Invalid destination.");
  }

  if (process.stdin.isTTY) {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent("http://a-nonexistent-website-lskjfpqslek41u20.com/")}`,
    );
    assert.equal(response.status, 502);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "TypeError: fetch failed");
  }

  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent("https://developer.mozilla.org/")}`,
    );
    assert.equal(response.status, 502);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Error: Invalid destination response.");
  }

  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent("https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg")}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/jpeg");
    await response.blob();
  }

  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm")}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "video/webm");
    await response.blob();
  }

  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent("https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3")}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
    await response.blob();
  }

  application.push({
    method: "GET",
    pathname: "/routes",
    handler: (request, response) => {
      response.end("<p>Hello World</p>");
    },
  });

  {
    const response = await fetch("http://localhost:18000/routes");
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/html; charset=utf-8",
    );
    assert.equal(await response.text(), "<p>Hello World</p>");
  }

  application.push({
    method: "GET",
    pathname: "/response-helpers",
    handler: (
      request: serverTypes.Request<{}, {}, {}, {}, { example: string }>,
      response,
    ) => {
      request.state.example = "Hello";
    },
  });

  application.push({
    method: "GET",
    pathname: "/response-helpers",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        { example: string; anotherExample: string },
        {},
        { example: string }
      >,
      response,
    ) => {
      assert.equal(request.state.example, "Hello");
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
    handler: (request, response) => {
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
    const response = await fetch("http://localhost:18000/response-helpers", {
      redirect: "manual",
      headers: { "Live-Navigation": "true" },
    });
    assert.equal(response.status, 303);
    assert.equal(
      response.headers.get("Location"),
      "http://localhost:18000/redirect",
    );
  }

  application.push({
    method: "GET",
    pathname: "/external-redirect",
    handler: (request: serverTypes.Request<{}, {}, {}, {}, {}>, response) => {
      response.redirect("https://leafac.com");
    },
  });

  {
    const response = await fetch("http://localhost:18000/external-redirect", {
      headers: { "Live-Navigation": "true" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Location"), "https://leafac.com/");
  }

  {
    const trace = new Array<string>();

    application.push({
      method: "GET",
      pathname: "/error",
      handler: (request, response) => {
        trace.push("BEFORE ERROR");
        throw new Error("ERROR");
        trace.push("AFTER ERROR");
      },
    });

    application.push({
      method: "GET",
      pathname: "/error",
      handler: (request, response) => {
        trace.push("UNREACHABLE HANDLER");
      },
    });

    application.push({
      error: true,
      method: "GET",
      pathname: "/error",
      handler: (request, response) => {
        trace.push("REACHABLE ERROR HANDLER");
        trace.push(String(request.error));
        response.end();
      },
    });

    application.push({
      error: true,
      method: "GET",
      pathname: "/error",
      handler: (request, response) => {
        trace.push("UNREACHABLE ERROR HANDLER");
      },
    });

    assert.equal((await fetch("http://localhost:18000/error")).status, 500);
    assert.deepEqual(trace, [
      "BEFORE ERROR",
      "REACHABLE ERROR HANDLER",
      "Error: ERROR",
    ]);
  }

  {
    application.push({
      method: "GET",
      pathname: "/validation",
      handler: (request, response) => {
        throw "validation";
      },
    });

    application.push({
      error: true,
      method: "GET",
      pathname: "/validation",
      handler: (request, response) => {
        response.end();
      },
    });

    assert.equal(
      (await fetch("http://localhost:18000/validation")).status,
      422,
    );
  }

  {
    const response = await fetch("http://localhost:18000/unhandled");
    assert.equal(response.status, 500);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(
      await response.text(),
      "The application didn’t finish handling this request.",
    );
  }

  application.push({
    method: "GET",
    pathname: "/live-connection",
    handler: (request, response) => {
      response.end(
        request.liveConnection?.establish &&
          request.liveConnection?.skipUpdateOnEstablish
          ? "SKIP UPDATE ON ESTABLISH"
          : request.id,
      );
    },
  });

  {
    const liveConnectionId = await (
      await fetch("http://localhost:18000/live-connection")
    ).text();

    {
      const response = await fetch("http://localhost:18000/live-connection", {
        method: "POST",
        headers: {
          "CSRF-Protection": "true",
          "Live-Connection": liveConnectionId,
        },
      });
      assert.equal(response.status, 400);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(
        await response.text(),
        "Error: Invalid ‘Live-Connection’ header.",
      );
    }

    {
      const response = await fetch("http://localhost:18000/live-connection", {
        headers: { "Live-Connection": "hi" },
      });
      assert.equal(response.status, 400);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(
        await response.text(),
        "Error: Invalid ‘Live-Connection’ header.",
      );
    }

    {
      const response = await fetch(
        "http://localhost:18000/live-connection?otherUrl=true",
        { headers: { "Live-Connection": liveConnectionId } },
      );
      assert.equal(response.status, 400);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(
        await response.text(),
        "Error: Unmatched ‘href’ of existing request.",
      );
    }

    {
      const fetchAbortController = new AbortController();
      const response = await fetch("http://localhost:18000/live-connection", {
        headers: { "Live-Connection": liveConnectionId },
        signal: fetchAbortController.signal,
      });
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Content-Type"),
        "application/json-lines; charset=utf-8",
      );
      assert(response.body);
      let body = "";
      const responseBodyReader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      (async () => {
        while (true) {
          const value = (
            await responseBodyReader.read().catch(() => ({ value: undefined }))
          ).value;
          if (value === undefined) break;
          body += value;
        }
      })();
      await timers.setTimeout(500);
      assert.equal(body, `\n"SKIP UPDATE ON ESTABLISH"\n`);

      body = "";
      await fetch("http://localhost:18000/__live-connections", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams({ pathname: "^/live-connection$" }),
      });
      await timers.setTimeout(500);
      assert.equal(body, `"${liveConnectionId}"\n`);
      fetchAbortController.abort();
      await timers.setTimeout(500);
    }

    await fetch("http://localhost:18000/__live-connections", {
      method: "POST",
      headers: { "CSRF-Protection": "true" },
      body: new URLSearchParams({ pathname: "^/live-connection$" }),
    });
    await timers.setTimeout(500);

    {
      const response = await fetch("http://localhost:18000/live-connection", {
        headers: { "Live-Connection": liveConnectionId },
      });
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Content-Type"),
        "application/json-lines; charset=utf-8",
      );
      assert(response.body);
      let body = "";
      const responseBodyReader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let responseBodyReaderEnded = false;
      (async () => {
        while (true) {
          const value = (
            await responseBodyReader.read().catch(() => ({ value: undefined }))
          ).value;
          if (value === undefined) {
            responseBodyReaderEnded = true;
            break;
          }
          body += value;
        }
      })();
      await timers.setTimeout(500);
      assert.equal(body, `\n"${liveConnectionId}"\n`);
      assert(!responseBodyReaderEnded);

      {
        const fetchAbortController = new AbortController();
        const response = await fetch("http://localhost:18000/live-connection", {
          headers: { "Live-Connection": liveConnectionId },
          signal: fetchAbortController.signal,
        });
        assert(responseBodyReaderEnded);
        assert.equal(response.status, 200);
        assert.equal(
          response.headers.get("Content-Type"),
          "application/json-lines; charset=utf-8",
        );
        assert(response.body);
        let body = "";
        const responseBodyReader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        (async () => {
          while (true) {
            const value = (
              await responseBodyReader
                .read()
                .catch(() => ({ value: undefined }))
            ).value;
            if (value === undefined) break;
            body += value;
          }
        })();
        await timers.setTimeout(500);
        assert.equal(body, `\n"SKIP UPDATE ON ESTABLISH"\n`);
        fetchAbortController.abort();
        await timers.setTimeout(500);
      }
    }
  }

  {
    const fetchAbortController = new AbortController();
    const response = await fetch("http://localhost:18000/unhandled", {
      headers: { "Live-Connection": "1j3k34l294jsdv" },
      signal: fetchAbortController.signal,
    });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json-lines; charset=utf-8",
    );
    assert(response.body);
    let body = "";
    const responseBodyReader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    (async () => {
      while (true) {
        const value = (
          await responseBodyReader.read().catch(() => ({ value: undefined }))
        ).value;
        if (value === undefined) break;
        body += value;
      }
    })();
    await timers.setTimeout(500);
    assert.equal(
      body,
      `\n"The application didn’t finish handling this request."\n`,
    );
    fetchAbortController.abort();
    await timers.setTimeout(500);
  }

  {
    const fetchAbortController = new AbortController();
    const response = await fetch("http://localhost:18000/live-connection", {
      headers: { "Live-Connection": "12312dwef123" },
      signal: fetchAbortController.signal,
    });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json-lines; charset=utf-8",
    );
    assert(response.body);
    let body = "";
    const responseBodyReader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    (async () => {
      while (true) {
        const value = (
          await responseBodyReader.read().catch(() => ({ value: undefined }))
        ).value;
        if (value === undefined) break;
        body += value;
      }
    })();
    await timers.setTimeout(500);
    assert.equal(body, `\n"12312dwef123"\n`);
    fetchAbortController.abort();
    await timers.setTimeout(500);
  }

  {
    const response = await fetch("http://localhost:18000/__live-connections", {
      method: "POST",
      headers: { "CSRF-Protection": "true" },
      body: new URLSearchParams({}),
    });
    assert.equal(response.status, 422);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Error: Invalid ‘pathname’.");
  }

  if (process.stdin.isTTY) {
    application.push({
      method: "GET",
      pathname: "/live-connection/manual",
      handler: async (request, response) => {
        await timers.setTimeout(3 * 1000);
        response.end(
          request.liveConnection?.establish &&
            request.liveConnection?.skipUpdateOnEstablish
            ? "SKIP UPDATE ON ESTABLISH"
            : new Date().toISOString(),
        );
      },
    });

    application.push({
      method: "GET",
      pathname: "/live-connection/browser",
      handler: (request, response) => {
        response.end(
          request.liveConnection?.establish &&
            request.liveConnection?.skipUpdateOnEstablish
            ? "SKIP UPDATE ON ESTABLISH"
            : `<!DOCTYPE html>
                <html>
                  <head>
                    <script>
                      (async () => {
                        const responseBodyReader = (await fetch(location.href, { headers: { "Live-Connection": ${JSON.stringify(request.id)} } })).body.pipeThrough(new TextDecoderStream()).getReader();
                        while (true) {
                          const value = (
                            await responseBodyReader.read().catch(() => ({ value: undefined }))
                          ).value;
                          if (value === undefined) break;
                          console.log(value);
                        }
                      })();
                    </script>
                  </head>
                  <body>Live Connection: ${new Date().toISOString()}. Open the Developer Tools Console and see the updates arriving.</body>
                </html>
              `,
        );
      },
    });

    console.log(`
============================================
    
Test proxy in browser with the following URLs:

http://localhost:18000/_proxy?destination=${encodeURIComponent("https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg")}

http://localhost:18000/_proxy?destination=${encodeURIComponent("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm")}

http://localhost:18000/_proxy?destination=${encodeURIComponent("https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3")}

--------------------------------------------

Test Live Connections (some of these tests may be more convenient to perform if you modify the timeouts in the source code):

1. Create a Live Connection to server:

$ curl -v --header "Live-Connection: fje89jvdj394f" "http://localhost:18000/live-connection/manual"

2. Receive heartbeat.

3. Receive periodic update.

4. Trigger updates:

$ curl -v --request POST --header "CSRF-Protection: true" --data-urlencode "pathname=^/live-connection/manual$" "http://localhost:18000/__live-connections"

In particular, trigger an update while an update is in progress.

5. Wait and check that the Live Connection is *not* deleted.

6. While still connected to the server, connect to the server again:

$ curl -v --header "Live-Connection: fje89jvdj394f" "http://localhost:18000/live-connection/manual"

The previous Live Connection should be closed, and the current Live Connection should *not* be deleted after a while.

7. Close the Live Connection to the server (⌃C). The Live Connection should be deleted after a while.

8. Prepare a Live Connection but don’t establish it and watch it be deleted after a while:

$ curl -v "http://localhost:18000/live-connection/manual"

9. Visit ‘http://localhost:18000/live-connection/browser’ in the browser. The Live Connection prepare must always happen before the establish.

============================================
`);
  } else {
    console.log(
      `
============================================

Interact with the test server and run manual tests with ‘node ./build/index.test.mjs’.

============================================
`,
    );
    node.exit();
  }
});
