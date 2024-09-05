import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";

test(async () => {
  process.chdir(path.join(import.meta.dirname, "../example-application/"));
  await util.promisify(childProcess.exec)(
    `npm${process.platform === "win32" ? ".cmd" : ""} ci`,
  );
  await util.promisify(childProcess.execFile)("node", [
    path.join(import.meta.dirname, "index.mjs"),
  ]);
  process.chdir(
    await fs.mkdtemp(
      path.join(os.tmpdir(), "radically-straightforward--package--test--"),
    ),
  );
  await fs.copyFile(
    path.join(
      import.meta.dirname,
      `../example-application.${
        process.platform === "win32" ? "zip" : "tar.gz"
      }`,
    ),
    `example-application.${process.platform === "win32" ? "zip" : "tar.gz"}`,
  );
  await fs.unlink(
    path.join(
      import.meta.dirname,
      `../example-application.${
        process.platform === "win32" ? "zip" : "tar.gz"
      }`,
    ),
  );
  await util.promisify(childProcess.execFile)("tar", [
    "-xzf",
    `example-application.${process.platform === "win32" ? "zip" : "tar.gz"}`,
  ]);
  const result = await util
    .promisify(childProcess.exec)(
      `${path.join(
        "./example-application/",
        `example-application${process.platform === "win32" ? ".cmd" : ""}`,
      )} examples of some extra command-line arguments`,
      { env: { ...process.env, EXAMPLE_PROGRAM: "true" } },
    )
    .catch((error) => error);
  assert.equal(result.code, 1);
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
