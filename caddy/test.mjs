import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs/promises";

const caddy = `node_modules/.bin/caddy${
  process.platform === "win32" ? ".exe" : ""
}`;

test(async () => {
  assert.strictEqual(
    await fs.access(caddy).catch(() => new Error()),
    undefined,
  );

  await execa("npm", ["run", "preuninstall"], { stdio: "inherit" });

  assert.notStrictEqual(
    await fs.access(caddy).catch(() => new Error()),
    undefined,
  );

  await execa("npm", ["run", "postinstall"], { stdio: "inherit" });

  assert.strictEqual(
    await fs.access(caddy).catch(() => new Error()),
    undefined,
  );
});
