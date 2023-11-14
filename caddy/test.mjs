import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const caddy = `node_modules/.bin/caddy${
  process.platform === "win32" ? ".exe" : ""
}`;

test(async () => {
  await fs.access(caddy);
});
