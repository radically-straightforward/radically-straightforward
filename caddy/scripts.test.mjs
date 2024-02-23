import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";

test({ /* FIXME */ skip: process.platform === "win32" }, async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "radically-straightforward--caddy--"),
  );
  await fs.writeFile(path.join(directory, "package.json"), JSON.stringify({}));
  await util.promisify(childProcess.execFile)(
    "npm",
    ["install", process.cwd()],
    { cwd: directory },
  );
  assert(
    (
      await util.promisify(childProcess.execFile)("npx", ["caddy", "version"], {
        cwd: directory,
      })
    ).stdout.startsWith("v"),
  );
  await util.promisify(childProcess.execFile)(
    "npm",
    ["uninstall", "@radically-straightforward/caddy"],
    { cwd: directory },
  );
  await assert.rejects(async () => {
    await util.promisify(childProcess.execFile)("npx", ["caddy"], {
      cwd: directory,
    });
  });
});
