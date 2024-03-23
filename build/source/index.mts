import path from "node:path";
import fs from "node:fs/promises";
import { globby } from "globby";
import babel from "@babel/core";
import babelGenerator from "@babel/generator";
import prettier from "prettier";
import esbuild from "esbuild";
import xxhash from "xxhash-addon";
import baseX from "base-x";
import css, { CSS } from "@radically-straightforward/css";
import { JavaScript } from "@radically-straightforward/javascript";

export default async function build({
  filesToCopyWithHash = [],
  filesToCopyWithoutHash = [],
}: {
  filesToCopyWithHash?: string[];
  filesToCopyWithoutHash?: string[];
}): Promise<void> {
  const cssSnippets = new Set<CSS>();
  const javascriptSnippets = new Set<JavaScript>();
  for (const source of await globby("./build/**/*.mjs")) {
    const fileCSSSnippets = new Array<CSS>();
    const fileJavaScriptSnippets = new Array<JavaScript>();
    let babelResult = await babel.transformFileAsync(source, {
      ast: true,
      code: false,
      plugins: [
        {
          visitor: {
            TaggedTemplateExpression: (path) => {
              if (path.node.tag.type !== "Identifier") return;
              switch (path.node.tag.name) {
                case "css": {
                  fileCSSSnippets.push(
                    new Function(
                      "css",
                      `return (${babelGenerator.default(path.node).code});`,
                    )(css),
                  );
                  break;
                }

                case "javascript": {
                  let javascriptSnippet = "";
                  for (const [index, quasi] of path.node.quasi.quasis.entries())
                    javascriptSnippet +=
                      (index === 0 ? `` : `$$${index - 1}`) +
                      quasi.value.cooked;
                  fileJavaScriptSnippets.push(javascriptSnippet);
                  break;
                }
              }
            },
          },
        },
      ],
    });
    if (
      babelResult === null ||
      babelResult.ast === undefined ||
      babelResult.ast === null
    )
      throw new Error("Babel transformation failed.");

    const cssIdentifiers = new Array<string>();
    for (const cssSnippet of fileCSSSnippets) {
      const canonicalCSSSnippet = (
        await prettier.format(`REMOVE { ${cssSnippet} }`, { parser: "css" })
      )
        .replace(/^\s*REMOVE\s*\{\s*/, "")
        .replace(/\s*\}\s*$/, "");
      const identifier = baseIdentifier.encode(
        xxhash.XXHash3.hash(Buffer.from(canonicalCSSSnippet)),
      );
      cssIdentifiers.push(identifier);
      cssSnippets.add(
        `/********************************************************************************/\n\n${`[css~="${identifier}"]`.repeat(
          6,
        )} {\n${canonicalCSSSnippet}}\n\n`,
      );
    }
    const javascriptIdentifiers = new Array<string>();
    for (const javascriptSnippet of javascriptIdentifiers) {
      const canonicalJavaScriptSnippet = (
        await prettier.format(`function REMOVE() { ${javascriptSnippet} }`, {
          parser: "babel",
        })
      )
        .replace(/^\s*function\s*REMOVE\(\s*\)\s*{\s*/, "")
        .replace(/\s*\}\s*$/, "");
      const identifier = baseIdentifier.encode(
        xxhash.XXHash3.hash(Buffer.from(canonicalJavaScriptSnippet)),
      );
      javascriptIdentifiers.push(identifier);
      javascriptSnippets.add(
        `/********************************************************************************/\n\nradicallyStraightforward.execute.functions.set("${identifier}", function (${[
          "event",
          ...path.node.quasi.expressions.map((value, index) => `$$${index}`),
        ].join(", ")}) {\n${javascriptSnippet}});\n\n`,
      );
    }

    babelResult = await babel.transformFromAstAsync(
      babelResult.ast,
      undefined,
      {
        cloneInputAst: false,
        sourceMaps: true,
        compact: false,
        plugins: [
          {
            visitor: {
              ImportDeclaration: (path) => {
                if (
                  (path.node.specifiers[0]?.local?.name === "css" &&
                    path.node.source?.value ===
                      "@radically-straightforward/css") ||
                  (path.node.specifiers[0]?.local?.name === "javascript" &&
                    path.node.source?.value ===
                      "@radically-straightforward/javascript")
                )
                  path.remove();
              },

              TaggedTemplateExpression: (path) => {
                if (path.node.tag.type !== "Identifier") return;
                switch (path.node.tag.name) {
                  case "css": {
                    const cssSnippet = new Function(
                      "css",
                      `return (${babelGenerator.default(path.node).code});`,
                    )(css);
                    const identifier = baseIdentifier.encode(
                      xxhash.XXHash3.hash(Buffer.from(cssSnippet)),
                    );
                    if (!cssIdentifiers.has(identifier)) {
                      cssIdentifiers.add(identifier);
                      extractedCSS += `/********************************************************************************/\n\n${`[css~="${identifier}"]`.repeat(
                        6,
                      )} {\n${cssSnippet}}\n\n`;
                    }
                    path.replaceWith(babel.types.stringLiteral(identifier));
                    break;
                  }

                  case "javascript": {
                    let javascriptSnippet = "";
                    for (const [
                      index,
                      quasi,
                    ] of path.node.quasi.quasis.entries())
                      javascriptSnippet +=
                        (index === 0 ? `` : `$$${index - 1}`) +
                        quasi.value.cooked;
                    const identifier = baseIdentifier.encode(
                      xxhash.XXHash3.hash(Buffer.from(javascriptSnippet)),
                    );
                    if (!javascriptIdentifiers.has(identifier)) {
                      javascriptIdentifiers.add(identifier);
                      extractedJavaScript += `/********************************************************************************/\n\nradicallyStraightforward.execute.functions.set("${identifier}", function (${[
                        "event",
                        ...path.node.quasi.expressions.map(
                          (value, index) => `$$${index}`,
                        ),
                      ].join(", ")}) {\n${javascriptSnippet}});\n\n`;
                    }
                    path.replaceWith(
                      babel.template.ast`
                        JSON.stringify({
                          function: ${babel.types.stringLiteral(identifier)},
                          arguments: ${babel.types.arrayExpression(
                            path.node.quasi.expressions as any,
                          )},
                        })
                      ` as any,
                    );
                    break;
                  }
                }
              },
            },
          },
        ],
      },
    );
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
    await fs.writeFile(`${source}.map`, JSON.stringify(babelResult.map));
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

  for (const source of await globby(filesToCopyWithHash)) {
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

  for (const source of await globby(filesToCopyWithoutHash)) {
    const destination = path.join(
      "./build/static/",
      source.replace(new RegExp("^(?:\\./)?(?:static/)?"), ""),
    );
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }
}

const baseIdentifier = baseX("abcdefghijklmnopqrstuvwxyz");
const baseFileHash = baseX("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
