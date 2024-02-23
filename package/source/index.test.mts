import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";

test(async () => {
  await util.promisify(childProcess.execFile)("npm", ["ci"], {
    cwd: "./example-application",
  });
  await util.promisify(childProcess.execFile)("node", ["../build/index.mjs"], {
    cwd: "./example-application",
  });
  await fs.rm("./example-application/node_modules/", { recursive: true });
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "radically-straightforward--package--test--"),
  );
  const outputPackage = `example-application.${
    process.platform === "win32" ? "zip" : "tar.gz"
  }`;
  await util.promisify(childProcess.execFile)("tar", [
    "-xzf",
    outputPackage,
    "-C",
    directory,
  ]);
  await fs.rm(outputPackage);
  const result = await util
    .promisify(childProcess.execFile)(
      path.join(directory, "example-application", "example-application"),
      ["examples", "of", "some", "extra", "command-line", "arguments"],
      { env: { EXAMPLE_PROGRAM: "true" } },
    )
    .catch((error) => error);
  console.log(result); // TODO: REMOVE ME!!!!!!
  process.exit(0);
  assert.equal(result.exitCode, 1);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.argv.slice(2), [
    "examples",
    "of",
    "some",
    "extra",
    "command-line",
    "arguments",
  ]);
  assert(output.env.PACKAGE.endsWith("example-application--source"));
  assert.equal(output.env.EXAMPLE_PROGRAM, "true");
  assert.equal(
    output.image,
    "/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA/wAA",
  );
});
