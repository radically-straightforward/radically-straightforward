import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import url from "node:url";
import markdown from "dedent";
import typescript from "dedent";
import { execa } from "execa";

test(async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "radically-straightforward--documentation--test--")
  );

  await fs.writeFile(
    path.join(directory, "README.md"),
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation

      <!-- DOCUMENTATION: index.mts -->
    `
  );
  await fs.writeFile(
    path.join(directory, "index.mts"),
    typescript`
      /**
       * Example of **documentation**.
       */
      export async function time(
        title: string,
        function_: () => void | Promise<void>,
      ): Promise<void> {
        // ...
      }
    `
  );
  await execa(
    "node",
    [url.fileURLToPath(new URL("./index.mjs", import.meta.url))],
    { cwd: directory }
  );
  assert.equal(
    await fs.readFile(path.join(directory, "README.md"), "utf-8"),
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation

      <!-- DOCUMENTATION START: index.mts -->

      TODO

      <!-- DOCUMENTATION END: index.mts -->
    `
  );

  await fs.writeFile(
    path.join(directory, "index.mts"),
    typescript`
      /**
       * Example of modified **documentation**.
       */
      export async function time(
        title: string,
        function_: () => void | Promise<void>,
      ): Promise<void> {
        // ...
      }
    `
  );
  await execa(
    "node",
    [url.fileURLToPath(new URL("./index.mjs", import.meta.url))],
    { cwd: directory }
  );
  assert.equal(
    await fs.readFile(path.join(directory, "README.md"), "utf-8"),
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation

      <!-- DOCUMENTATION START: index.mts -->

      TODO

      <!-- DOCUMENTATION END: index.mts -->
    `
  );
});
