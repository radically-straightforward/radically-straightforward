#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import childProcess from "node:child_process";
import util from "node:util";
import babel from "@babel/core";
import babelTypes from "@babel/types";
import babelGenerator from "@babel/generator";
import prettier from "prettier";

for (const input of process.argv.length === 2
  ? ["./README.md"]
  : process.argv.slice(2)) {
  let documentation = await fs.readFile(input, "utf-8");
  for (const match of [
    ...documentation.matchAll(
      /<!-- DOCUMENTATION(?: START)?: (?<directive>.*?) -->(?:.*?<!-- DOCUMENTATION END: \k<directive> -->)?/gsu,
    ),
  ].reverse()) {
    if (match.groups === undefined || match.index === undefined) continue;
    const matchReplacementParts: (string | Promise<string>)[] = [];
    if (match.groups.directive.startsWith("$"))
      matchReplacementParts.push(
        "```\n",
        (
          await util.promisify(childProcess.exec)(
            match.groups.directive.slice(1),
            { cwd: path.dirname(input) },
          )
        ).stdout,
        "\n```\n\n",
      );
    else
      babel.transformAsync(
        await fs.readFile(
          path.join(path.dirname(input), match.groups.directive),
          "utf-8",
        ),
        {
          parserOpts: { plugins: ["typescript"] },
          plugins: [
            {
              visitor: {
                "ExportDefaultDeclaration|ExportNamedDeclaration": (
                  path: any,
                ) => {
                  if (
                    path.node.leadingComments?.length !== 1 ||
                    !path.node.leadingComments[0].value.startsWith("*")
                  )
                    return;
                  matchReplacementParts.push(
                    "### `",
                    path.node.declaration.type === "FunctionDeclaration"
                      ? path.node.declaration.id.name + "()"
                      : path.node.declaration.type === "VariableDeclaration" &&
                          path.node.declaration.declarations.length === 1
                        ? path.node.declaration.declarations[0].id.name
                        : path.node.declaration.type === "ClassDeclaration"
                          ? path.node.declaration.id.name
                          : path.node.declaration.type ===
                              "TSTypeAliasDeclaration"
                            ? path.node.declaration.id.name
                            : (() => {
                                throw new Error(
                                  `Unknown ‘Declaration’: ‘${
                                    path.node.declaration.type
                                  }’\n${
                                    babelGenerator.default({
                                      ...path.node,
                                      leadingComments: [],
                                      trailingComments: [],
                                    }).code
                                  }`,
                                );
                              })(),
                    "`\n\n```typescript\n",
                    (async () =>
                      (
                        await prettier.format(
                          babelGenerator.default(
                            path.node.declaration.type === "FunctionDeclaration"
                              ? {
                                  ...path.node,
                                  leadingComments: [],
                                  trailingComments: [],
                                  declaration: {
                                    ...path.node.declaration,
                                    body: babelTypes.blockStatement([]),
                                  },
                                }
                              : path.node.declaration.type ===
                                    "VariableDeclaration" &&
                                  path.node.declaration.declarations.length ===
                                    1
                                ? {
                                    ...path.node,
                                    leadingComments: [],
                                    trailingComments: [],
                                    declaration: {
                                      ...path.node.declaration,
                                      declarations: [
                                        {
                                          ...path.node.declaration
                                            .declarations[0],
                                          init: babelTypes.identifier("___"),
                                        },
                                      ],
                                    },
                                  }
                                : path.node.declaration.type ===
                                    "ClassDeclaration"
                                  ? {
                                      ...path.node,
                                      leadingComments: [],
                                      trailingComments: [],
                                      declaration: {
                                        ...path.node.declaration,
                                        body: babelTypes.classBody([]),
                                      },
                                    }
                                  : path.node.declaration.type ===
                                      "TSTypeAliasDeclaration"
                                    ? {
                                        ...path.node,
                                        leadingComments: [],
                                        trailingComments: [],
                                      }
                                    : (() => {
                                        throw new Error(
                                          `Unknown ‘Declaration’: ‘${
                                            path.node.declaration.type
                                          }’\n${
                                            babelGenerator.default({
                                              ...path.node,
                                              leadingComments: [],
                                              trailingComments: [],
                                            }).code
                                          }`,
                                        );
                                      })(),
                          ).code,
                          { parser: "babel-ts" },
                        )
                      )
                        .trim()
                        .slice(
                          0,
                          -(
                            path.node.declaration.type === "FunctionDeclaration"
                              ? "{}"
                              : path.node.declaration.type ===
                                  "VariableDeclaration"
                                ? "= ___;"
                                : path.node.declaration.type ===
                                    "ClassDeclaration"
                                  ? "{}"
                                  : path.node.declaration.type ===
                                      "TSTypeAliasDeclaration"
                                    ? ";"
                                    : (() => {
                                        throw new Error(
                                          `Unknown ‘Declaration’: ‘${
                                            path.node.declaration.type
                                          }’\n${
                                            babelGenerator.default({
                                              ...path.node,
                                              leadingComments: [],
                                              trailingComments: [],
                                            }).code
                                          }`,
                                        );
                                      })()
                          ).length,
                        )
                        .trim())(),
                    ";\n```\n\n",
                    path.node.leadingComments[0].value
                      .replace(/^\s*\* ?/gmu, "")
                      .trim(),
                    "\n\n",
                  );
                  if (
                    path.node.declaration.type === "ClassDeclaration" &&
                    path.node.declaration.body.type === "ClassBody"
                  )
                    for (const classBodyNode of path.node.declaration.body
                      .body) {
                      if (
                        classBodyNode.leadingComments?.length !== 1 ||
                        !classBodyNode.leadingComments[0].value.startsWith("*")
                      )
                        continue;
                      matchReplacementParts.push(
                        "#### `",
                        path.node.declaration.id.name,
                        ".",
                        classBodyNode.key.name,
                        ...(classBodyNode.type === "ClassMethod" ? ["()"] : ""),
                        "`\n\n```typescript\n",
                        (async () =>
                          (
                            await prettier.format(
                              `class ___ {${
                                babelGenerator.default(
                                  classBodyNode.type === "ClassMethod"
                                    ? {
                                        ...classBodyNode,
                                        leadingComments: [],
                                        trailingComments: [],
                                        body: babelTypes.blockStatement([]),
                                      }
                                    : classBodyNode.type === "ClassProperty"
                                      ? {
                                          ...classBodyNode,
                                          leadingComments: [],
                                          trailingComments: [],
                                          value: babelTypes.identifier("___"),
                                        }
                                      : (() => {
                                          throw new Error(
                                            `Unknown ‘ClassBody.body’ element type: ‘${
                                              classBodyNode.type
                                            }’\n${
                                              babelGenerator.default({
                                                ...classBodyNode,
                                                leadingComments: [],
                                                trailingComments: [],
                                              }).code
                                            }`,
                                          );
                                        })(),
                                ).code
                              }}`,
                              { parser: "babel-ts" },
                            )
                          )
                            .trim()
                            .slice("class ___ {".length, -"}".length)
                            .trim()
                            .slice(
                              0,
                              -(
                                classBodyNode.type === "ClassMethod"
                                  ? "{}"
                                  : classBodyNode.type === "ClassProperty"
                                    ? "= ___;"
                                    : (() => {
                                        throw new Error(
                                          `Unknown ‘ClassBody.body’ element type: ‘${
                                            classBodyNode.type
                                          }’\n${
                                            babelGenerator.default({
                                              ...classBodyNode,
                                              leadingComments: [],
                                              trailingComments: [],
                                            }).code
                                          }`,
                                        );
                                      })()
                              ).length,
                            )
                            .trim())(),
                        ";\n```\n\n",
                        classBodyNode.leadingComments[0].value
                          .replace(/^\s*\* ?/gmu, "")
                          .trim(),
                        "\n\n",
                      );
                    }
                },
              },
            },
          ],
        },
      );
    documentation =
      documentation.slice(0, match.index) +
      `<!-- DOCUMENTATION START: ${match.groups.directive} -->\n\n` +
      (await Promise.all(matchReplacementParts)).join("") +
      `<!-- DOCUMENTATION END: ${match.groups.directive} -->` +
      documentation.slice(match.index + match[0].length);
  }
  await fs.writeFile(input, documentation);
}
