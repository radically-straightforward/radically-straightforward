import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import timers from "node:timers/promises";
import * as node from "@radically-straightforward/node";
import * as utilities from "@radically-straightforward/utilities";
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
      response.send();
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
      response.send(JSON.stringify(request.body.bodyFileExample.path));
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
        response.send(request.getFlash?.() ?? "No flash");
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
      response.send("<p>Hello World</p>");
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
  application.push({
    pathname: "/may-start-live-connection--1",
    handler: (request: serverTypes.Request<{}, {}, {}, {}, {}>, response) => {
      response.send(JSON.stringify(response.mayStartLiveConnection()));
    },
  });
  {
    const response = await fetch(
      "http://localhost:18000/may-start-live-connection--1",
    );
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(await response.text()), true);
  }
  {
    const response = await fetch(
      "http://localhost:18000/may-start-live-connection--1",
      { method: "POST", headers: { "CSRF-Protection": "true" } },
    );
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(await response.text()), false);
  }
  application.push({
    pathname: "/may-start-live-connection--2",
    handler: (request: serverTypes.Request<{}, {}, {}, {}, {}>, response) => {
      response.statusCode = 404;
      response.send(JSON.stringify(response.mayStartLiveConnection()));
    },
  });
  {
    const response = await fetch(
      "http://localhost:18000/may-start-live-connection--2",
    );
    assert.equal(response.status, 404);
    assert.equal(JSON.parse(await response.text()), false);
  }
  application.push({
    pathname: "/may-start-live-connection--3",
    handler: (request: serverTypes.Request<{}, {}, {}, {}, {}>, response) => {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.send(JSON.stringify(response.mayStartLiveConnection()));
    },
  });
  {
    const response = await fetch(
      "http://localhost:18000/may-start-live-connection--3",
    );
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(await response.text()), false);
  }
  {
    const abortController = new AbortController();
    const response = await fetch(
      "http://localhost:18000/may-start-live-connection--1",
      {
        headers: { "Live-Connection": "12345" },
        signal: abortController.signal,
      },
    );
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json-lines; charset=utf-8",
    );
    assert(response.body);
    const responseBodyReader = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new utilities.JSONLinesTransformStream())
      .getReader();
    assert.equal(JSON.parse((await responseBodyReader.read()).value), false);
    abortController.abort();
    await timers.setTimeout(500);
  }
  application.push({
    method: "GET",
    pathname: "/response-helpers",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        { cookieExample1: string; cookieExample2: string },
        {},
        {}
      >,
      response,
    ) => {
      assert.equal(request.cookies.cookieExample1, undefined);
      assert.equal(request.cookies.cookieExample2, undefined);
      response.setCookie?.("cookieExample1", "1");
      response.setCookie?.("cookieExample2", "2");
      assert.equal(request.cookies.cookieExample1, "1");
      assert.equal(request.cookies.cookieExample2, "2");
      response.deleteCookie?.("cookieExample2");
      assert.equal(request.cookies.cookieExample2, undefined);
      response.redirect?.("/redirect");
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
      "__Host-cookieExample1=1; Max-Age=12960000; Path=/; Secure; HttpOnly; SameSite=None",
      "__Host-cookieExample2=2; Max-Age=12960000; Path=/; Secure; HttpOnly; SameSite=None",
      "__Host-cookieExample2=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None",
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
    handler: (request, response) => {
      response.redirect?.(
        "https://github.com/radically-straightforward/radically-straightforward",
      );
    },
  });
  {
    const response = await fetch("http://localhost:18000/external-redirect", {
      headers: { "Live-Navigation": "true" },
    });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Location"),
      "https://github.com/radically-straightforward/radically-straightforward",
    );
  }
  application.push({
    method: "GET",
    pathname: "/live-connection",
    handler: (request, response) => {
      response.send(
        JSON.stringify({
          requestId: request.id,
          requestLiveConnection: request.liveConnection,
        }),
      );
    },
  });
  {
    const response = await fetch("http://localhost:18000/live-connection", {
      method: "POST",
      headers: {
        "CSRF-Protection": "true",
        "Live-Connection": "12345",
      },
    });
    assert.equal(response.status, 400);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await response.text(), "Error: Invalid request method.");
  }
  {
    const response = await fetch("http://localhost:18000/live-connection", {
      headers: { "Live-Connection": "12" },
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
    const liveConnectionResponse = await (
      await fetch("http://localhost:18000/live-connection")
    ).json();
    assert.equal(liveConnectionResponse.requestLiveConnection, false);
    {
      const response = await fetch(
        "http://localhost:18000/live-connection?unmatched-url",
        { headers: { "Live-Connection": liveConnectionResponse.requestId } },
      );
      assert.equal(response.status, 400);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "Error: Unmatched ‘href’.");
    }
    {
      const abortController = new AbortController();
      const response = await fetch("http://localhost:18000/live-connection", {
        headers: { "Live-Connection": liveConnectionResponse.requestId },
        signal: abortController.signal,
      });
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Content-Type"),
        "application/json-lines; charset=utf-8",
      );
      assert(response.body);
      {
        const response = await fetch("http://localhost:18000/live-connection", {
          headers: { "Live-Connection": liveConnectionResponse.requestId },
        });
        assert.equal(response.status, 400);
        assert.equal(
          response.headers.get("Content-Type"),
          "text/plain; charset=utf-8",
        );
        assert.equal(await response.text(), "Error: Already connected.");
      }
      const responseBodyReader = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new utilities.JSONLinesTransformStream())
        .getReader();
      let responseBodyRequestLiveConnection;
      assert.rejects(async () => {
        await utilities.timeout(1000, async () => {
          responseBodyRequestLiveConnection = JSON.parse(
            (await responseBodyReader.read()).value,
          ).requestLiveConnection;
        });
      });
      await fetch("http://localhost:18000/__live-connections", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams({ pathname: "^/live-connection$" }),
      });
      await timers.setTimeout(500);
      assert.equal(responseBodyRequestLiveConnection, true);
      abortController.abort();
      await timers.setTimeout(500);
    }
    {
      const abortController = new AbortController();
      const response = await fetch("http://localhost:18000/live-connection", {
        headers: { "Live-Connection": liveConnectionResponse.requestId },
        signal: abortController.signal,
      });
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Content-Type"),
        "application/json-lines; charset=utf-8",
      );
      assert(response.body);
      const responseBodyReader = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new utilities.JSONLinesTransformStream())
        .getReader();
      assert.equal(
        JSON.parse((await responseBodyReader.read()).value)
          .requestLiveConnection,
        true,
      );
      await fetch("http://localhost:18000/__live-connections", {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
        body: new URLSearchParams({ pathname: "^/live-connection$" }),
      });
      await timers.setTimeout(500);
      assert.equal(
        JSON.parse((await responseBodyReader.read()).value)
          .requestLiveConnection,
        true,
      );
      abortController.abort();
      await timers.setTimeout(500);
    }
  }
  {
    const liveConnectionResponse = await (
      await fetch("http://localhost:18000/live-connection")
    ).json();
    await fetch("http://localhost:18000/__live-connections", {
      method: "POST",
      headers: { "CSRF-Protection": "true" },
      body: new URLSearchParams({ pathname: "^/live-connection$" }),
    });
    await timers.setTimeout(500);
    const abortController = new AbortController();
    const response = await fetch("http://localhost:18000/live-connection", {
      headers: { "Live-Connection": liveConnectionResponse.requestId },
      signal: abortController.signal,
    });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json-lines; charset=utf-8",
    );
    assert(response.body);
    const responseBodyReader = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new utilities.JSONLinesTransformStream())
      .getReader();
    assert.equal(
      JSON.parse((await responseBodyReader.read()).value).requestLiveConnection,
      true,
    );
    abortController.abort();
    await timers.setTimeout(500);
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
      method: "GET",
      pathname: "/error",
      error: true,
      handler: (request, response) => {
        trace.push("REACHABLE ERROR HANDLER");
        trace.push(String(request.error));
        response.send();
      },
    });
    application.push({
      method: "GET",
      pathname: "/error",
      error: true,
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
  application.push({
    method: "GET",
    pathname: "/validation",
    handler: (request, response) => {
      throw "validation";
    },
  });
  application.push({
    method: "GET",
    pathname: "/validation",
    error: true,
    handler: (request, response) => {
      response.send();
    },
  });
  {
    const response = await fetch("http://localhost:18000/validation");
    assert.equal(response.status, 422);
  }
  {
    const response = await fetch("http://localhost:18000/nonexisting");
    assert.equal(response.status, 500);
    assert.equal(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(
      await response.text(),
      "The application didn’t finish responding to this request.",
    );
  }
  {
    const abortController = new AbortController();
    const response = await fetch("http://localhost:18000/nonexisting", {
      headers: { "Live-Connection": "12345" },
      signal: abortController.signal,
    });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Content-Type"),
      "application/json-lines; charset=utf-8",
    );
    assert(response.body);
    const responseBodyReader = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new utilities.JSONLinesTransformStream())
      .getReader();
    assert.equal(
      (await responseBodyReader.read()).value,
      "The application didn’t finish responding to this request.",
    );
    abortController.abort();
    await timers.setTimeout(500);
  }
  {
    const response = await fetch("http://localhost:18000/_health");
    assert.equal(response.status, 200);
  }
  {
    const response = await fetch("http://localhost:18000/_proxy");
    assert.equal(response.status, 500);
  }
  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent(
        "not-a-url",
      )}`,
    );
    assert.equal(response.status, 500);
  }
  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent(
        "ftp://localhost",
      )}`,
    );
    assert.equal(response.status, 500);
  }
  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent(
        "http://localhost/",
      )}`,
    );
    assert.equal(response.status, 500);
  }
  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent(
        "http://a-nonexistent-website-lskjfpqslek41u20.com/",
      )}`,
    );
    assert.equal(response.status, 500);
  }
  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent(
        "https://developer.mozilla.org/",
      )}`,
    );
    assert.equal(response.status, 500);
  }
  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent(
        "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
      )}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/jpeg");
    await response.blob();
  }
  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent(
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
      )}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "video/webm");
    await response.blob();
  }
  {
    const response = await fetch(
      `http://localhost:18000/_proxy?destination=${encodeURIComponent(
        "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
      )}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
    await response.blob();
  }
  {
    const response = await fetch("http://localhost:18000/__live-connections", {
      method: "POST",
      headers: { "CSRF-Protection": "true" },
      body: new URLSearchParams({}),
    });
    assert.equal(response.status, 500);
  }
  node.exit();
});
