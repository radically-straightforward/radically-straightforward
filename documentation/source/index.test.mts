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
    path.join(os.tmpdir(), "radically-straightforward--documentation--test--"),
  );

  await fs.writeFile(
    path.join(directory, "README.md"),
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation

      <!-- DOCUMENTATION: index.mts -->

      ## Run Command

      <!-- DOCUMENTATION: $ head -n 1 ./index.mts -->
    `,
  );
  await fs.writeFile(
    path.join(directory, "index.mts"),
    typescript`
      /**
       * Example of function documentation with **Markdown**.
       */
      export async function exampleFunctionDeclaration(
        a: string,
        b: number,
      ): Promise<void> {
        // ...
      }

      /**
       * Example of constant documentation.
       */
      export const exampleVariableDeclaration: number = 33;
    `,
  );
  await execa(
    "node",
    [url.fileURLToPath(new URL("./index.mjs", import.meta.url))],
    { cwd: directory, stdio: "inherit" },
  );
  assert.equal(
    await fs.readFile(path.join(directory, "README.md"), "utf-8"),
    // prettier-ignore
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation
      
      <!-- DOCUMENTATION START: index.mts -->
      
      \`\`\`typescript
      export async function exampleFunctionDeclaration(
        a: string,
        b: number,
      ): Promise<void>
      \`\`\`
      
      Example of function documentation with **Markdown**.

      ---

      \`\`\`typescript
      export const exampleVariableDeclaration: number
      \`\`\`

      Example of constant documentation.
      
      <!-- DOCUMENTATION END: index.mts -->
      
      ## Run Command
      
      <!-- DOCUMENTATION START: $ head -n 1 ./index.mts -->
      
      \`\`\`
      /**
      \`\`\`
      
      <!-- DOCUMENTATION END: $ head -n 1 ./index.mts -->
    `,
  );

  await fs.writeFile(
    path.join(directory, "index.mts"),
    typescript`
      /**
       * Example of <ins>modified</ins> function documentation with **Markdown**.
       */
      export async function exampleFunctionDeclaration(
        a: string,
        b: number,
      ): Promise<void> {
        // ...
      }
    `,
  );
  await execa(
    "node",
    [url.fileURLToPath(new URL("./index.mjs", import.meta.url))],
    { cwd: directory, stdio: "inherit" },
  );
  assert.equal(
    await fs.readFile(path.join(directory, "README.md"), "utf-8"),
    // prettier-ignore
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation

      <!-- DOCUMENTATION START: index.mts -->

      \`\`\`typescript
      export async function exampleFunctionDeclaration(
        a: string,
        b: number,
      ): Promise<void>
      \`\`\`

      Example of <ins>modified</ins> function documentation with **Markdown**.

      <!-- DOCUMENTATION END: index.mts -->

      ## Run Command
      
      <!-- DOCUMENTATION START: $ head -n 1 ./index.mts -->
      
      \`\`\`
      /**
      \`\`\`
      
      <!-- DOCUMENTATION END: $ head -n 1 ./index.mts -->
    `,
  );
});
