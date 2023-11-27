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

      <!-- DOCUMENTATION: $ tail -n 1 ./index.mts -->
    `,
  );
  await fs.writeFile(
    path.join(directory, "index.mts"),
    typescript`
      /**
       * Example of \`FunctionDeclaration\`, default export, and **Markdown**.
       */
      export default async function exampleOfFunctionDeclaration(
        a: string,
        b: number,
      ): Promise<void> {
        // ...
      }

      /**
       * Example of \`VariableDeclaration\`.
       */
      export const exampleOfVariableDeclaration: number = 33;

      /**
       * Example of \`ClassDeclaration\`.
       */
      export class ExampleOfClassDeclaration {
        /**
         * Example of \`ClassMethod\`.
         */
        exampleOfClassMethod(): void {
          // ...
        }
      
        /**
         * Example of \`ClassPrivateMethod\`.
         */
        #exampleOfClassMethod(): void {
          // ...
        }

        /**
         * Example of \`ClassProperty\`.
         */
        exampleOfClassProperty: number = 33;
      
        /**
         * Example of \`ClassPrivateProperty\`.
         */
        #exampleOfClassPrivateProperty: number = 33;
      }

      /**
       * Example of \`TSTypeAliasDeclaration\`.
       */
      export type ExampleOfTSTypeAliasDeclaration = string;

      // Example of last line for command.
    `,
  );
  await execa(
    "node",
    [url.fileURLToPath(new URL("./index.mjs", import.meta.url))],
    { cwd: directory, stdio: "inherit" },
  );
  console.log(await fs.readFile(path.join(directory, "README.md"), "utf-8"));
  // assert.equal(
  //   await fs.readFile(path.join(directory, "README.md"), "utf-8"),
  //   // prettier-ignore
  //   markdown`
  //     # Example of \`@radically-straightforward/documentation\`

  //     ## Extract TypeScript Documentation

  //     <!-- DOCUMENTATION START: index.mts -->

  //     \`\`\`typescript
  //     export default async function exampleOfFunctionDeclaration(
  //       a: string,
  //       b: number,
  //     ): Promise<void>
  //     \`\`\`

  //     Example of \`FunctionDeclaration\`, default export, and **Markdown**.

  //     ---

  //     \`\`\`typescript
  //     export const exampleOfVariableDeclaration: number
  //     \`\`\`

  //     Example of \`VariableDeclaration\`.

  //     ---

  //     \`\`\`typescript
  //     export class ExampleOfClassDeclaration
  //     \`\`\`

  //     Example of \`ClassDeclaration\`.

  //     ---

  //     \`\`\`typescript
  //     export type ExampleOfTSTypeAliasDeclaration = string
  //     \`\`\`

  //     Example of \`TSTypeAliasDeclaration\`.

  //     <!-- DOCUMENTATION END: index.mts -->

  //     ## Run Command

  //     <!-- DOCUMENTATION START: $ tail -n 1 ./index.mts -->

  //     \`\`\`
  //     // Example of last line for command.
  //     \`\`\`

  //     <!-- DOCUMENTATION END: $ tail -n 1 ./index.mts -->
  //   `,
  // );

  // await fs.writeFile(
  //   path.join(directory, "index.mts"),
  //   typescript`
  //     /**
  //      * Example of modified documentation.
  //      */
  //     export const exampleOfModifiedDocumentation: number = 33;

  //     // Example of modified last line for command.
  //   `,
  // );
  // await execa(
  //   "node",
  //   [url.fileURLToPath(new URL("./index.mjs", import.meta.url))],
  //   { cwd: directory, stdio: "inherit" },
  // );
  // assert.equal(
  //   await fs.readFile(path.join(directory, "README.md"), "utf-8"),
  //   // prettier-ignore
  //   markdown`
  //     # Example of \`@radically-straightforward/documentation\`

  //     ## Extract TypeScript Documentation

  //     <!-- DOCUMENTATION START: index.mts -->

  //     \`\`\`typescript
  //     export const exampleOfModifiedDocumentation: number
  //     \`\`\`

  //     Example of modified documentation.

  //     <!-- DOCUMENTATION END: index.mts -->

  //     ## Run Command
      
  //     <!-- DOCUMENTATION START: $ tail -n 1 ./index.mts -->
      
  //     \`\`\`
  //     // Example of modified last line for command.
  //     \`\`\`
      
  //     <!-- DOCUMENTATION END: $ tail -n 1 ./index.mts -->
  //   `,
  // );
});
