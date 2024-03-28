import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";
import url from "node:url";

test(async () => {
  process.chdir(
    url.fileURLToPath(new URL("../example-application/", import.meta.url)),
  );
  await util.promisify(childProcess.execFile)(
    `npm${process.platform === "win32" ? ".cmd" : ""}`,
    ["ci"],
  );
  await util.promisify(childProcess.execFile)("node", [
    url.fileURLToPath(new URL("./index.mjs", import.meta.url)),
  ]);
  process.chdir(
    await fs.mkdtemp(
      path.join(os.tmpdir(), "radically-straightforward--package--test--"),
    ),
  );
  await fs.copyFile(
    new URL(
      `../example-application.${
        process.platform === "win32" ? "zip" : "tar.gz"
      }`,
      import.meta.url,
    ),
    `example-application.${process.platform === "win32" ? "zip" : "tar.gz"}`,
  );
  await fs.unlink(
    new URL(
      `../example-application.${
        process.platform === "win32" ? "zip" : "tar.gz"
      }`,
      import.meta.url,
    ),
  );
  await util.promisify(childProcess.execFile)("tar", [
    "-xzf",
    `example-application.${process.platform === "win32" ? "zip" : "tar.gz"}`,
  ]);
  const result = await util
    .promisify(childProcess.execFile)(
      `./example-application/example-application${process.platform === "win32" ? ".cmd" : ""}`,
      ["examples", "of", "some", "extra", "command-line", "arguments"],
      { env: { ...process.env, EXAMPLE_PROGRAM: "true" } },
    )
    .catch((error) => error);
  assert.equal(result.code, 1);
  console.log("===========================>", result.code);
  console.log("===========================>", result.stdout);
  console.log("===========================>", result.stderr);
  console.log("===========================>", result);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.argv.slice(2), [
    "examples",
    "of",
    "some",
    "extra",
    "command-line",
    "arguments",
  ]);
  assert(output.env.PACKAGE.endsWith("_"));
  assert.equal(output.env.EXAMPLE_PROGRAM, "true");
  assert.equal(
    output.image,
    "/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA",
  );
});
