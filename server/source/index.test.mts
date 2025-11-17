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
  node.exit();
});
