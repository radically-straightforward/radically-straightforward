import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import childProcess from "node:child_process";
import * as caddy from "@radically-straightforward/caddy";
import * as utilities from "@radically-straightforward/utilities";

test(
  {
    skip: process.stdin.isTTY
      ? false
      : "Install Caddy, make sure that the local certificate authority is working, and run interactive test with ‘node ./build/index.test.mjs’.",
  },
  async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "radically-straightforward--caddy--"),
    );

    await fs.mkdir(path.join(directory, "static/"), { recursive: true });
    await fs.writeFile(
      path.join(directory, "static/example.css"),
      `body { background-color: red; }`,
    );

    await fs.mkdir(path.join(directory, "data/files/"), { recursive: true });
    await fs.writeFile(
      path.join(directory, "data/sensitive.txt"),
      `EXAMPLE OF SENSITIVE FILE THAT MUST BE INACCESSIBLE`,
    );
    await fs.writeFile(
      path.join(directory, "data/files/example.txt"),
      `EXAMPLE OF USER-GENERATED TXT FILE THAT MAY BE EMBEDDED`,
    );
    await fs.writeFile(
      path.join(directory, "data/files/example.html"),
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        EXAMPLE OF USER-GENERATED HTML FILE THAT MUST BE DOWNLOADED
      </body>
      </html>
    `,
    );
    await fs.writeFile(
      path.join(directory, "data/files/example--html.txt"),
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        EXAMPLE OF USER-GENERATED HTML FILE DISGUISED AS TXT THAT MUST BE SERVED AS TXT
      </body>
      </html>
    `,
    );

    const dynamicServer = http
      .createServer((request, response) => {
        response.end(`DYNAMIC RESPONSE: ${new Date().toISOString()}`);
      })
      .listen(18000, "localhost");

    const caddyServer = childProcess.spawn(
      path.resolve("./node_modules/.bin/caddy"),
      ["run", "--adapter", "caddyfile", "--config", "-"],
      { cwd: directory, stdio: [undefined, "ignore", "ignore"] },
    );
    caddyServer.stdin.end(caddy.application());

    await utilities.sleep(2 * 1000);

    {
      const response = await fetch("https://localhost/example.css");
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Cache-Control"),
        "public, max-age=31536000, immutable",
      );
      assert.equal(await response.text(), `body { background-color: red; }`);
    }

    for (const url of [
      "https://localhost/sensitive.txt",
      "https://localhost/data/sensitive.txt",
      "https://localhost/data/files/sensitive.txt",
      "https://localhost/files/sensitive.txt",
    ]) {
      const response = await fetch(url);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert((await response.text()).startsWith("DYNAMIC RESPONSE"));
    }

    {
      const response = await fetch("https://localhost/files/example.txt");
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Cache-Control"),
        "private, max-age=31536000, immutable",
      );
      assert.equal(
        response.headers.get("Cross-Origin-Resource-Policy"),
        "cross-origin",
      );
      assert.equal(response.headers.get("Content-Disposition"), null);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(
        await response.text(),
        `EXAMPLE OF USER-GENERATED TXT FILE THAT MAY BE EMBEDDED`,
      );
    }

    {
      const response = await fetch("https://localhost/files/example.html");
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Cache-Control"),
        "private, max-age=31536000, immutable",
      );
      assert.equal(
        response.headers.get("Cross-Origin-Resource-Policy"),
        "same-origin",
      );
      assert.equal(response.headers.get("Content-Disposition"), "attachment");
      assert.equal(
        response.headers.get("Content-Type"),
        "text/html; charset=utf-8",
      );
      assert(
        (await response.text()).includes(
          `EXAMPLE OF USER-GENERATED HTML FILE THAT MUST BE DOWNLOADED`,
        ),
      );
    }

    {
      const response = await fetch("https://localhost/files/example--html.txt");
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Cache-Control"),
        "private, max-age=31536000, immutable",
      );
      assert.equal(
        response.headers.get("Cross-Origin-Resource-Policy"),
        "cross-origin",
      );
      assert.equal(response.headers.get("Content-Disposition"), null);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/plain; charset=utf-8",
      );
      assert(
        (await response.text()).includes(
          `EXAMPLE OF USER-GENERATED HTML FILE DISGUISED AS TXT THAT MUST BE SERVED AS TXT`,
        ),
      );
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

    caddyServer.kill();
  },
);
