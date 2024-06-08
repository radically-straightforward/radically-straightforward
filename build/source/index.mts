#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import util from "node:util";
import { globby } from "globby";
import babel from "@babel/core";
import babelGenerator from "@babel/generator";
import prettier from "prettier";
import postcss from "postcss";
import postcssLightDarkFunction from "@csstools/postcss-light-dark-function";
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
      default: [],
    },
    "file-to-copy-without-hash": {
      type: "string",
      multiple: true,
      default: [],
    },
  },
});

const globalCSSs = new Array<CSS>();
const globalJavaScripts = new Array<JavaScript>();
const inlineCSSs = new Set<CSS>();
const inlineJavaScripts = new Set<JavaScript>();
const baseIdentifier = baseX("abcdefghijklmnopqrstuvwxyz");
for (const source of await globby("./build/**/*.mjs")) {
  const fileGlobalCSSs = new Array<CSS>();
  const fileGlobalJavaScripts = new Array<JavaScript>();
  const fileInlineCSSs = new Array<CSS>();
  const fileInlineJavaScripts = new Array<JavaScript>();
  await babel.transformFileAsync(source, {
    code: false,
    plugins: [
      {
        visitor: {
          TaggedTemplateExpression: (path) => {
            if (path.node.tag.type !== "Identifier") return;
            const isGlobal = path.parent.type === "ExpressionStatement";
            switch (path.node.tag.name) {
              case "css":
                const code = new Function(
                  "css",
                  `return (${babelGenerator.default(path.node).code});`,
                )(css);
                if (isGlobal) fileGlobalCSSs.push(code);
                else
                  fileInlineCSSs.push(
                    `__RADICALLY__STRAIGHTFORWARD__PLACEHOLDER__ { ${code} }`,
                  );
                break;
              case "javascript":
                if (isGlobal) {
                  if (
                    path.node.quasi.quasis.length !== 1 ||
                    typeof path.node.quasi.quasis[0].value.cooked !== "string"
                  )
                    throw new Error(
                      "Global browser JavaScript doesn’t support interpolation.",
                    );
                  fileGlobalJavaScripts.push(
                    path.node.quasi.quasis[0].value.cooked,
                  );
                } else
                  fileInlineJavaScripts.push(
                    `async function __RADICALLY__STRAIGHTFORWARD__PLACEHOLDER__(${[
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
  for (let code of fileGlobalCSSs) {
    code = await prettier.format(code, { parser: "css" });
    globalCSSs.push(
      `/********************************************************************************/\n\n${code}\n\n`,
    );
  }
  for (let code of fileGlobalJavaScripts) {
    code = await prettier.format(code, { parser: "babel" });
    globalJavaScripts.push(
      `/********************************************************************************/\n\n${code}\n\n`,
    );
  }
  const fileInlineCSSIdentifiers = new Array<string>();
  for (let code of fileInlineCSSs) {
    code = await prettier.format(code, { parser: "css" });
    const identifier = baseIdentifier.encode(
      xxhash.XXHash3.hash(Buffer.from(code)),
    );
    code = code.replace(
      /^__RADICALLY__STRAIGHTFORWARD__PLACEHOLDER__/,
      `[css~="${identifier}"]`,
    );
    fileInlineCSSIdentifiers.push(identifier);
    inlineCSSs.add(
      `/********************************************************************************/\n\n@layer ${identifier} {\n${code}\n}\n\n`,
    );
  }
  const fileInlineJavaScriptIdentifiers = new Array<string>();
  for (let code of fileInlineJavaScripts) {
    code = await prettier.format(code, { parser: "babel" });
    const identifier = baseIdentifier.encode(
      xxhash.XXHash3.hash(Buffer.from(code)),
    );
    code = `javascript?.execute?.functions?.set?.("${identifier}", ${code.replace(
      /^async function __RADICALLY__STRAIGHTFORWARD__PLACEHOLDER__/,
      "async function",
    )});`;
    fileInlineJavaScriptIdentifiers.push(identifier);
    inlineJavaScripts.add(
      `/********************************************************************************/\n\n${code}\n\n`,
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
            if (path.parent.type === "ExpressionStatement") {
              path.remove();
              return;
            }
            switch (path.node.tag.name) {
              case "css":
                path.replaceWith(
                  babel.types.stringLiteral(fileInlineCSSIdentifiers.shift()!),
                );
                break;
              case "javascript":
                path.replaceWith(
                  babel.template.ast`
                    JSON.stringify({
                      function: ${babel.types.stringLiteral(fileInlineJavaScriptIdentifiers.shift()!)},
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

await fs.mkdir("./static/", { recursive: true });
await fs.writeFile(
  "./static/index.css",
  (
    await postcss([postcssLightDarkFunction()]).process(
      css`
        ${[...globalCSSs].join("")}

        @layer __RADICALLY_STRAIGHTFORWARD__INLINE__ {
          ${[...inlineCSSs].join("")}
        }
      `,
      { from: undefined },
    )
  ).css,
);
await fs.writeFile(
  "./static/index.mjs",
  [...globalJavaScripts, ...inlineJavaScripts].join(""),
);
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
  await fs.unlink("./static/index.css");
  await fs.unlink("./static/index.mjs");
}

const paths: { [key: string]: string } = {};

for (const [output, { entryPoint }] of Object.entries(
  esbuildResult.metafile?.outputs ?? {},
))
  if (entryPoint === "index.css" || entryPoint === "index.mjs")
    paths[entryPoint] = output.slice("../build/static/".length);

await fs.writeFile(
  path.join("./build/static/", paths["index.css"]),
  "@layer __RADICALLY_STRAIGHTFORWARD__GLOBAL__{" +
    (
      await fs.readFile(
        path.join("./build/static/", paths["index.css"]),
        "utf-8",
      )
    ).replace(
      "@layer __RADICALLY_STRAIGHTFORWARD__INLINE__",
      "}@layer __RADICALLY_STRAIGHTFORWARD__INLINE__",
    ),
);

const baseFileHash = baseX("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
for (const source of await globby(["./static/", ...filesToCopyWithHash!])) {
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

await fs.writeFile("./build/static.json", JSON.stringify(paths, undefined, 2));

for (const source of await globby([
  "./static/favicon.ico",
  "./static/apple-touch-icon.png",
  ...filesToCopyWithoutHash!,
])) {
  const destination = path.join(
    "./build/static/",
    source.replace(new RegExp("^(?:\\./)?(?:static/)?"), ""),
  );
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}
