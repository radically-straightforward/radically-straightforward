import test from "node:test";
import assert from "node:assert";
import childProcess from "node:child_process";
import util from "node:util";

test({ skip: process.platform === "win32" }, async () => {
  assert(
    (
      await util.promisify(childProcess.execFile)("npx", ["caddy", "version"])
    ).stdout.startsWith("v"),
  );
  await util.promisify(childProcess.execFile)("node", [
    "scripts.mjs",
    "preuninstall",
  ]);
  await assert.rejects(async () => {
    await util.promisify(childProcess.execFile)("npx", ["caddy", "version"]);
  });
  await util.promisify(childProcess.execFile)("node", [
    "scripts.mjs",
    "postinstall",
  ]);
  assert(
    (
      await util.promisify(childProcess.execFile)("npx", ["caddy", "version"])
    ).stdout.startsWith("v"),
  );
});
