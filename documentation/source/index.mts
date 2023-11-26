#!/usr/bin/env node

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import * as commander from "commander";
import dedent from "dedent";
import * as babelParser from "@babel/parser";
import babelTraverse from "@babel/traverse";
import babelGenerator from "@babel/generator";

const packageJSON = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf-8")
);

await commander.program
  .name("documentation")
  .description(packageJSON.description)
  .argument(
    "[input...]",
    "The files including directives for ‘documentation’ to process.",
    ["./README.md"]
  )
  .version(packageJSON.version)
  .addHelpText("after", "\n" + dedent`TODO`)
  .allowExcessArguments(false)
  .showHelpAfterError()
  .action(async (inputs: string[]) => {
    for (const input of inputs) {
      await fs.writeFile(
        input,
        (
          await fs.readFile(input, "utf-8")
        ).replace(
          /<!-- documentation(?: start)?: (?<typescript>.*?)(?: \(extracted automatically via @radically-straightforward\/documentation; don’t edit by hand or your changes will be overwritten\))? -->(?:.*?<!-- documentation end: \k<typescript> -->)?/gv,
          (...match) => {
            let documentation = "";
            babelTraverse.default(
              babelParser.parse(
                fsSync.readFileSync(
                  path.join(input, "..", match.at(-1).typescript),
                  "utf-8"
                ),
                {
                  sourceType: "module",
                  plugins: ["typescript"],
                }
              ),
              {
                ExportNamedDeclaration: (path) => {
                  if (
                    path.node.declaration !== undefined &&
                    path.node.declaration !== null &&
                    path.node.leadingComments?.length === 1 &&
                    path.node.leadingComments[0].value.startsWith("*")
                  )
                    documentation +=
                      "```typescript\n" +
                      babelGenerator
                        .default({
                          ...(path.node.declaration as any),
                          body: {
                            ...(path.node.declaration as any).body,
                            body: [],
                          },
                        })
                        .code.replace(/\{\s*\}\s*$/v, "") +
                      "\n```\n\n" +
                      path.node.leadingComments[0].value
                        .replace(/^\s*\* ?/gmv, "")
                        .trim() +
                      "\n\n";
                },
              }
            );
            return `<!-- documentation start: ${
              match.at(-1).typescript
            } (extracted automatically via @radically-straightforward/documentation; don’t edit by hand or your changes will be overwritten) -->\n\n${documentation}<!-- documentation end: ${
              match.at(-1).typescript
            } -->`;
          }
        )
      );
    }
  })
  .parseAsync();
