import test from "node:test";
import assert from "node:assert";
import childProcess from "node:child_process";
import util from "node:util";

test(async () => {
  assert(
    (
      await util.promisify(childProcess.execFile)(
        "./node_modules/.bin/ffmpeg",
        ["-version"],
      )
    ).stdout.startsWith("ffmpeg"),
  );
  await util.promisify(childProcess.execFile)("node", [
    "scripts.mjs",
    "preuninstall",
  ]);
  await assert.rejects(async () => {
    await util.promisify(childProcess.execFile)("./node_modules/.bin/ffmpeg", [
      "-version",
    ]);
  });
  await util.promisify(childProcess.execFile)("node", [
    "scripts.mjs",
    "postinstall",
  ]);
  assert(
    (
      await util.promisify(childProcess.execFile)(
        "./node_modules/.bin/ffmpeg",
        ["-version"],
      )
    ).stdout.startsWith("ffmpeg"),
  );
});
