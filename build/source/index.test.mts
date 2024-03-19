import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import build from "@radically-straightforward/build";

test(async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "radically-straightforward--build--test--"),
  );

  await fs.mkdir(path.join(directory, "static"));
  await fs.writeFile(path.join(directory, "static/example.txt"), "Example");
  await fs.mkdir(path.join(directory, "static/select-subdirectory"));
  await fs.writeFile(
    path.join(
      directory,
      "static/select-subdirectory/select-subdirectory--example.txt",
    ),
    "Select subdirectory",
  );
  await fs.mkdir(path.join(directory, "static/all-subdirectory"));
  for (let index = 0; index < 5; index++)
    await fs.writeFile(
      path.join(
        directory,
        `static/all-subdirectory/all-subdirectory--example--${index}.txt`,
      ),
      `All subdirectory: ${index}`,
    );

  process.chdir(directory);
  await build({ filesToCopy: [] });

  assert.equal(
    await fs.readFile(
      path.join(directory, "build/static/example.txt"),
      "utf-8",
    ),
    "Example",
  );
});
