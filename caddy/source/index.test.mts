import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import childProcess from "node:child_process";
import * as caddy from "@radically-straightforward/caddy";
import * as utilities from "@radically-straightforward/utilities";

// TODO: Remove:
// - ‘only’ from this test.
// - ‘--test-only’ from  ‘package.json’
test.only({ timeout: 30 * 1000 }, async () => {
  const dynamicServer = http
    .createServer((request, response) => {
      response.end(`DYNAMIC RESPONSE: ${new Date().toISOString()}`);
    })
    .listen(18000, "localhost");

  const reverseProxy = childProcess.spawn(
    "./node_modules/@radically-straightforward/caddy/caddy",
    ["run", "--adapter", "caddyfile", "--config", "-"],
    { stdio: [undefined, "ignore", "ignore"] },
  );
  reverseProxy.stdin.end(
    caddy.application({
      staticFilesRoots: ["./source/"],
      userGeneratedFilesRoots: [
        "./node_modules/@radically-straightforward/caddy/",
      ],
    }),
  );

  await utilities.sleep(2 * 1000);

  {
    const response = await fetch("https://localhost/index.test.mts");
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, max-age=31536000, immutable",
    );
    assert((await response.text()).startsWith("import"));
  }

  {
    const response = await fetch("https://localhost/");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert((await response.text()).startsWith("DYNAMIC RESPONSE"));
  }

  {
    const response = await fetch("http://localhost/", { redirect: "manual" });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("Cache-Control"), null);
    assert.equal(response.headers.get("Location"), "https://localhost/");
  }

  dynamicServer.close();

  await utilities.sleep(2 * 1000);

  {
    const response = await fetch("https://localhost/");
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }

  reverseProxy.kill();
});
