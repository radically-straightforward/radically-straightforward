#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import * as commander from "commander";
import dedent from "dedent";
import * as babelParser from "@babel/parser";
import babelTraverse from "@babel/traverse";
import babelTypes from "@babel/types";
import babelGenerator from "@babel/generator";
import prettier from "prettier";

const packageJSON = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf-8"),
);

await commander.program
  .name(packageJSON.name.replace(/^.*\//v, ""))
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
          /<!-- DOCUMENTATION(?: START)?: (?<directive>.*?) -->(?:.*<!-- DOCUMENTATION END: \k<directive> -->)?/gv,
        ),
      ].reverse()) {
        if (match.groups === undefined || match.index === undefined) continue;
        const matchReplacementParts: (string | (() => Promise<string>))[] = [];
        babelTraverse.default(
          babelParser.parse(
            await fs.readFile(
              path.join(input, "..", match.groups.directive),
              "utf-8",
            ),
            {
              sourceType: "module",
              plugins: ["typescript"],
            },
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
              matchReplacementParts.push(
                "```typescript\n",
                async () =>
                  (
                    await prettier.format(
                      babelGenerator.default({
                        ...(path.node.declaration as any),
                        body: babelTypes.blockStatement([]),
                      }).code,
                      { parser: "babel-ts" },
                    )
                  ).replace(/\s*\{\s*\}\s*$/v, ""),
                "\n```\n\n",
                path.node.leadingComments[0].value
                  .replace(/^\s*\* ?/gmv, "")
                  .trim(),
                "\n\n",
              );
            },
          },
        );
        let matchReplacement = "";
        for (const matchReplacementPart of matchReplacementParts)
          matchReplacement +=
            typeof matchReplacementPart === "string"
              ? matchReplacementPart
              : await matchReplacementPart();
        documentation =
          documentation.slice(0, match.index) +
          matchReplacement +
          documentation.slice(match.index + match[0].length);
      }
      await fs.writeFile(input, documentation);
    }
  })
  .parseAsync();
