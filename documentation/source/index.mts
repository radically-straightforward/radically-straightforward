#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import * as commander from "commander";
import dedent from "dedent";
import { execaCommand } from "execa";
import * as babelParser from "@babel/parser";
import babelTraverse from "@babel/traverse";
import babelTypes from "@babel/types";
import babelGenerator from "@babel/generator";
import prettier from "prettier";

const packageJSON = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf-8"),
);

await commander.program
  .name(packageJSON.name.replace(/^.*?\//v, ""))
  .description(packageJSON.description)
  .argument(
    "[input...]",
    "The files with documentation directives to process.",
    ["./README.md"],
  )
  .version(packageJSON.version)
  .addHelpText("after", "\n" + dedent`TODO`)
  .allowExcessArguments(false)
  .showHelpAfterError()
  .action(async (inputs: string[]) => {
    for (const input of inputs) {
      let documentation = await fs.readFile(input, "utf-8");
      for (const match of [
        ...documentation.matchAll(
          /<!-- DOCUMENTATION(?: START)?: (?<directive>.*?) -->(?:.*?<!-- DOCUMENTATION END: \k<directive> -->)?/gsv,
        ),
      ].reverse()) {
        if (match.groups === undefined || match.index === undefined) continue;
        const matchReplacementParts: (string | Promise<string>)[][] = [];
        if (match.groups.directive.startsWith("$"))
          matchReplacementParts.push([
            "```\n",
            (
              await execaCommand(match.groups.directive.slice(1), {
                cwd: path.dirname(input),
                all: true,
              })
            ).all!,
            "\n```",
          ]);
        else
          babelTraverse.default(
            babelParser.parse(
              await fs.readFile(
                path.join(input, "..", match.groups.directive),
                "utf-8",
              ),
              { sourceType: "module", plugins: ["typescript"] },
            ),
            {
              ExportNamedDeclaration: (path) => {
                if (
                  path.node.declaration === undefined ||
                  path.node.declaration === null ||
                  path.node.leadingComments?.length !== 1 ||
                  !path.node.leadingComments[0].value.startsWith("*")
                )
                  return;
                matchReplacementParts.push([
                  "```typescript\n",
                  (async () =>
                    (
                      await prettier.format(
                        babelGenerator.default(
                          path.node.declaration!.type === "FunctionDeclaration"
                            ? {
                                ...path.node,
                                leadingComments: [],
                                trailingComments: [],
                                declaration: {
                                  ...path.node.declaration,
                                  body: babelTypes.blockStatement([]),
                                },
                              }
                            : path.node.declaration!.type ===
                                "VariableDeclaration"
                              ? {
                                  ...path.node,
                                  leadingComments: [],
                                  trailingComments: [],
                                  declaration: {
                                    ...path.node.declaration,
                                    declarations:
                                      path.node.declaration.declarations.map(
                                        (declaration) => ({
                                          ...declaration,
                                          init: babelTypes.identifier("___"),
                                        }),
                                      ),
                                  },
                                }
                              : (() => {
                                  throw new Error(
                                    `Unknown ‘ExportNamedDeclaration’: ‘${
                                      path.node.declaration!.type
                                    }’\n${
                                      babelGenerator.default({
                                        ...path.node,
                                        trailingComments: [],
                                      }).code
                                    }`,
                                  );
                                })(),
                        ).code,
                        { parser: "babel-ts" },
                      )
                    )
                      .replace(
                        path.node.declaration.type === "FunctionDeclaration"
                          ? /\{\s*\}\s*$/v
                          : path.node.declaration.type === "VariableDeclaration"
                            ? /=\s*___;\s*$/v
                            : /NEVER/v,
                        "",
                      )
                      .trim())(),
                  "\n```\n\n",
                  path.node.leadingComments[0].value
                    .replace(/^\s*\* ?/gmv, "")
                    .trim(),
                ]);
              },
            },
          );
        documentation =
          documentation.slice(0, match.index) +
          `<!-- DOCUMENTATION START: ${match.groups.directive} -->\n\n` +
          (
            await Promise.all(
              matchReplacementParts.map(async (matchReplacementPart) =>
                (await Promise.all(matchReplacementPart)).join(""),
              ),
            )
          ).join("\n\n---\n\n") +
          `\n\n<!-- DOCUMENTATION END: ${match.groups.directive} -->` +
          documentation.slice(match.index + match[0].length);
      }
      await fs.writeFile(input, documentation);
    }
  })
  .parseAsync();
