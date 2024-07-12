import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import url from "node:url";
import childProcess from "node:child_process";
import util from "node:util";
import { dedent as markdown } from "@radically-straightforward/utilities";
import { dedent as typescript } from "@radically-straightforward/utilities";

test(async () => {
  process.chdir(
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "radically-straightforward--documentation--test--",
      ),
    ),
  );
  // console.log(process.cwd());

  await fs.writeFile(
    "README.md",
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation

      <!-- DOCUMENTATION: ./index.mts -->

      ## Run Command

      <!-- DOCUMENTATION: $ tail -n 1 ./index.mts -->
    `,
  );
  await fs.writeFile(
    "index.mts",
    typescript`
      /**
       * Example of \`FunctionDeclaration\`.
       *
       * **\`exampleOfParameter\`:** Example of some documentation about a parameter.
       *
       * **Return:** Example of some documentation about the return value.
       */
      export default async function exampleOfFunctionDeclaration(
        exampleOfParameter: string,
      ): Promise<string> {
        // ...
      }

      /**
       * Example of \`VariableDeclaration\`.
       */
      export const exampleOfVariableDeclaration: string = "exampleOfVariableDeclaration";

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
         * Example of \`ClassProperty\`.
         */
        exampleOfClassProperty: string = "exampleOfClassProperty";
      }

      /**
       * Example of \`TSTypeAliasDeclaration\`.
       */
      export type ExampleOfTSTypeAliasDeclaration = string;

      // Example of last line for command.
    `,
  );
  await util.promisify(childProcess.execFile)("node", [
    url.fileURLToPath(new URL("./index.mjs", import.meta.url)),
  ]);
  assert.equal(
    await fs.readFile("README.md", "utf-8"),
    // prettier-ignore
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation
      
      <!-- DOCUMENTATION START: ./index.mts -->
      
      ### \`exampleOfFunctionDeclaration()\`
      
      \`\`\`typescript
      export default async function exampleOfFunctionDeclaration(
        exampleOfParameter: string,
      ): Promise<string>;
      \`\`\`
      
      Example of \`FunctionDeclaration\`.
      
      **\`exampleOfParameter\`:** Example of some documentation about a parameter.
      
      **Return:** Example of some documentation about the return value.
      
      ### \`exampleOfVariableDeclaration\`
      
      \`\`\`typescript
      export const exampleOfVariableDeclaration: string;
      \`\`\`
      
      Example of \`VariableDeclaration\`.
      
      ### \`ExampleOfClassDeclaration\`
      
      \`\`\`typescript
      export class ExampleOfClassDeclaration;
      \`\`\`
      
      Example of \`ClassDeclaration\`.
      
      #### \`ExampleOfClassDeclaration.exampleOfClassMethod()\`
      
      \`\`\`typescript
      exampleOfClassMethod(): void;
      \`\`\`
      
      Example of \`ClassMethod\`.
      
      #### \`ExampleOfClassDeclaration.exampleOfClassProperty\`
      
      \`\`\`typescript
      exampleOfClassProperty: string;
      \`\`\`
      
      Example of \`ClassProperty\`.
      
      ### \`ExampleOfTSTypeAliasDeclaration\`
      
      \`\`\`typescript
      export type ExampleOfTSTypeAliasDeclaration = string;
      \`\`\`
      
      Example of \`TSTypeAliasDeclaration\`.
      
      <!-- DOCUMENTATION END: ./index.mts -->
      
      ## Run Command
      
      <!-- DOCUMENTATION START: $ tail -n 1 ./index.mts -->
      
      \`\`\`
      // Example of last line for command.
      \`\`\`
      
      <!-- DOCUMENTATION END: $ tail -n 1 ./index.mts -->
    `,
  );

  await fs.writeFile(
    "index.mts",
    typescript`
      /**
       * Example of modified documentation.
       */
      export const exampleOfModifiedDocumentation: string = "exampleOfModifiedDocumentation";

      // Example of modified last line for command.
    `,
  );
  await util.promisify(childProcess.execFile)("node", [
    url.fileURLToPath(new URL("./index.mjs", import.meta.url)),
  ]);
  assert.equal(
    await fs.readFile("README.md", "utf-8"),
    // prettier-ignore
    markdown`
      # Example of \`@radically-straightforward/documentation\`

      ## Extract TypeScript Documentation
      
      <!-- DOCUMENTATION START: ./index.mts -->
      
      ### \`exampleOfModifiedDocumentation\`
      
      \`\`\`typescript
      export const exampleOfModifiedDocumentation: string;
      \`\`\`
      
      Example of modified documentation.
      
      <!-- DOCUMENTATION END: ./index.mts -->
      
      ## Run Command
      
      <!-- DOCUMENTATION START: $ tail -n 1 ./index.mts -->
      
      \`\`\`
      // Example of modified last line for command.
      \`\`\`
      
      <!-- DOCUMENTATION END: $ tail -n 1 ./index.mts -->
    `,
  );
});
