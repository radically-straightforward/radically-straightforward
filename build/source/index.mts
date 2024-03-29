#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import util from "node:util";
import { globby } from "globby";
import babel from "@babel/core";
import babelGenerator from "@babel/generator";
import prettier from "prettier";
import esbuild from "esbuild";
import xxhash from "xxhash-addon";
import baseX from "base-x";
import css, { CSS } from "@radically-straightforward/css";
import { JavaScript } from "@radically-straightforward/javascript";

const {
  values: {
    "file-to-copy-with-hash": filesToCopyWithHash,
    "file-to-copy-without-hash": filesToCopyWithoutHash,
  },
} = util.parseArgs({
  options: {
    "file-to-copy-with-hash": {
      type: "string",
      multiple: true,
      short: "f",
      default: [],
    },
    "file-to-copy-without-hash": {
      type: "string",
      multiple: true,
      short: "F",
      default: [],
    },
  },
});

const cssSnippets = new Set<CSS>();
const javascriptSnippets = new Set<JavaScript>();
const baseIdentifier = baseX("abcdefghijklmnopqrstuvwxyz");
for (const source of await globby("./build/**/*.mjs")) {
  const fileCSSSnippets = new Array<CSS>();
  const fileJavaScriptSnippets = new Array<JavaScript>();
  await babel.transformFileAsync(source, {
    code: false,
    plugins: [
      {
        visitor: {
          TaggedTemplateExpression: (path) => {
            if (path.node.tag.type !== "Identifier") return;
            switch (path.node.tag.name) {
              case "css":
                fileCSSSnippets.push(
                  `PLACEHOLDER { ${new Function(
                    "css",
                    `return (${babelGenerator.default(path.node).code});`,
                  )(css)} }`,
                );
                break;
              case "javascript":
                fileJavaScriptSnippets.push(
                  `async function PLACEHOLDER(${[
                    "event",
                    ...path.node.quasi.expressions.map(
                      (value, index) => `$$${index}`,
                    ),
                  ].join(", ")}) { ${path.node.quasi.quasis
                    .map(
                      (quasi, index) =>
                        (index === 0 ? `` : `$$${index - 1}`) +
                        quasi.value.cooked,
                    )
                    .join("")} }`,
                );
                break;
            }
          },
        },
      },
    ],
  });
  const cssIdentifiers = new Array<string>();
  for (let snippet of fileCSSSnippets) {
    snippet = await prettier.format(snippet, { parser: "css" });
    const identifier = baseIdentifier.encode(
      xxhash.XXHash3.hash(Buffer.from(snippet)),
    );
    cssIdentifiers.push(identifier);
    cssSnippets.add(
      `/********************************************************************************/\n\n${snippet.replace(
        /^PLACEHOLDER/,
        `[css~="${identifier}"]`.repeat(6),
      )}\n\n`,
    );
  }
  const javascriptIdentifiers = new Array<string>();
  for (let snippet of fileJavaScriptSnippets) {
    snippet = await prettier.format(snippet, { parser: "babel" });
    const identifier = baseIdentifier.encode(
      xxhash.XXHash3.hash(Buffer.from(snippet)),
    );
    javascriptIdentifiers.push(identifier);
    javascriptSnippets.add(
      `/********************************************************************************/\n\njavascript?.execute?.functions?.set?.("${identifier}", ${snippet.replace(/^async function PLACEHOLDER/, "async function")});\n\n`,
    );
  }
  const babelResult = await babel.transformFileAsync(source, {
    compact: false,
    sourceMaps: true,
    plugins: [
      {
        visitor: {
          ImportDeclaration: (path) => {
            if (
              (path.node.specifiers[0]?.local?.name === "css" &&
                path.node.source?.value === "@radically-straightforward/css") ||
              (path.node.specifiers[0]?.local?.name === "javascript" &&
                path.node.source?.value ===
                  "@radically-straightforward/javascript")
            )
              path.remove();
          },
          TaggedTemplateExpression: (path) => {
            if (path.node.tag.type !== "Identifier") return;
            switch (path.node.tag.name) {
              case "css":
                path.replaceWith(
                  babel.types.stringLiteral(cssIdentifiers.shift()!),
                );
                break;
              case "javascript":
                path.replaceWith(
                  babel.template.ast`
                    JSON.stringify({
                      function: ${babel.types.stringLiteral(javascriptIdentifiers.shift()!)},
                      arguments: ${babel.types.arrayExpression(
                        path.node.quasi
                          .expressions as Array<babel.types.Expression>,
                      )},
                    })
                  ` as babel.types.Node,
                );
                break;
            }
          },
        },
      },
    ],
  });
  if (
    babelResult === null ||
    babelResult.code === undefined ||
    babelResult.code === null ||
    babelResult.map === undefined ||
    babelResult.map === null
  )
    throw new Error("Babel transformation failed.");
  await fs.writeFile(
    source,
    `${babelResult.code}\n//# sourceMappingURL=${path.basename(source)}.map`,
  );
  await fs.writeFile(
    `${source}.map`,
    JSON.stringify(babelResult.map, undefined, 2),
  );
}

await fs.copyFile("./static/index.css", "./static/_index.css");
await fs.copyFile("./static/index.mjs", "./static/_index.mjs");
await fs.appendFile("./static/index.css", [...cssSnippets].join(""));
await fs.appendFile("./static/index.mjs", [...javascriptSnippets].join(""));
let esbuildResult: esbuild.BuildResult;
try {
  esbuildResult = await esbuild.build({
    absWorkingDir: path.resolve("./static/"),
    entryPoints: ["./index.css", "./index.mjs"],
    outdir: "../build/static/",
    entryNames: "[dir]/[name]--[hash]",
    assetNames: "[dir]/[name]--[hash]",
    loader: { ".woff2": "file", ".woff": "file", ".ttf": "file" },
    target: ["chrome100", "safari14", "edge100", "firefox100", "ios14"],
    bundle: true,
    minify: true,
    sourcemap: true,
    metafile: true,
  });
} finally {
  await fs.rename("./static/_index.css", "./static/index.css");
  await fs.rename("./static/_index.mjs", "./static/index.mjs");
}

const paths: { [key: string]: string } = {};

for (const [output, { entryPoint }] of Object.entries(
  esbuildResult.metafile?.outputs ?? {},
))
  if (entryPoint === "index.css" || entryPoint === "index.mjs")
    paths[entryPoint] = output.slice("../build/static/".length);

const baseFileHash = baseX("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
for (const source of await globby(filesToCopyWithHash!)) {
  const destination = path.join(
    "./build/static/",
    `${source.replace(new RegExp("^(?:\\./)?(?:static/)?"), "").slice(0, -path.extname(source).length)}--${baseFileHash.encode(
      xxhash.XXHash3.hash(await fs.readFile(source)),
    )}${path.extname(source)}`,
  );
  paths[source.replace(new RegExp("^(?:\\./)?(?:static/)?"), "")] =
    destination.slice("build/static/".length);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

await fs.writeFile(
  "./build/static/paths.json",
  JSON.stringify(paths, undefined, 2),
);

for (const source of await globby(filesToCopyWithoutHash!)) {
  const destination = path.join(
    "./build/static/",
    source.replace(new RegExp("^(?:\\./)?(?:static/)?"), ""),
  );
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}
