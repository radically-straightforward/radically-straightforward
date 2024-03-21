import path from "node:path";
import fs from "node:fs/promises";
import { globby } from "globby";
import babel from "@babel/core";
import babelGenerator from "@babel/generator";
import esbuild from "esbuild";
import xxhash from "xxhash-addon";
import baseX from "base-x";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";

export default async function build({
  filesToCopyWithHash = [],
  filesToCopyWithoutHash = [],
}: {
  filesToCopyWithHash?: string[];
  filesToCopyWithoutHash?: string[];
}): Promise<void> {
  let extractedCSS = await fs.readFile("./static/index.css", "utf-8");
  let extractedJavaScript = await fs.readFile("./static/index.mjs", "utf-8");

  const cssIdentifiers = new Set();
  const javascriptIdentifiers = new Set();
  for (const source of await globby("./build/**/*.mjs")) {
    const babelResult = await babel.transformAsync(
      await fs.readFile(source, "utf-8"),
      {
        filename: source,
        sourceMaps: true,
        sourceFileName: path.relative(path.dirname(source), source),
        compact: false,
        plugins: [
          "typescript",
          {
            visitor: {
              ImportDeclaration: (path) => {
                if (
                  (path.node.specifiers[0]?.local?.name === "css" &&
                    path.node.source?.value === "@leafac/css") ||
                  (path.node.specifiers[0]?.local?.name === "javascript" &&
                    path.node.source?.value === "@leafac/javascript")
                )
                  path.remove();
              },

              TaggedTemplateExpression: (path) => {
                switch (path.node.tag.name) {
                  case "css": {
                    const css_ = new Function(
                      "css",
                      `return (${babelGenerator.default(path.node).code});`,
                    )(css);
                    const identifier = baseIdentifier.encode(
                      xxhash.XXHash3.hash(Buffer.from(css_)),
                    );
                    if (!cssIdentifiers.has(identifier)) {
                      cssIdentifiers.add(identifier);
                      extractedCSS += css`/********************************************************************************/\n\n${`[css~="${identifier}"]`.repeat(
                        6,
                      )} {\n${css_}}\n\n`;
                    }
                    path.replaceWith(babel.types.stringLiteral(identifier));
                    break;
                  }

                  case "javascript": {
                    let javascript_ = "";
                    for (const [
                      index,
                      quasi,
                    ] of path.node.quasi.quasis.entries())
                      javascript_ +=
                        (index === 0 ? `` : `$$${index - 1}`) +
                        quasi.value.cooked;
                    const identifier = baseIdentifier.encode(
                      xxhash.XXHash3.hash(Buffer.from(javascript_)),
                    );
                    if (!javascriptIdentifiers.has(identifier)) {
                      javascriptIdentifiers.add(identifier);
                      extractedJavaScript += javascript`/********************************************************************************/\n\nleafac.execute.functions.set("${identifier}", function (${[
                        "event",
                        ...path.node.quasi.expressions.map(
                          (value, index) => `$$${index}`,
                        ),
                      ].join(", ")}) {\n${javascript_}});\n\n`;
                    }
                    path.replaceWith(
                      babel.template.ast`
                      JSON.stringify({
                        function: ${babel.types.stringLiteral(identifier)},
                        arguments: ${babel.types.arrayExpression(
                          path.node.quasi.expressions,
                        )},
                      })
                    `,
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
    await babel.transformFromAstAsync(babelResult.ast, code, {});

    await fs.writeFile(
      source,
      `${babelResult.code}\n//# sourceMappingURL=${path.basename(source)}.map`,
    );
    await fs.writeFile(`${source}.map`, JSON.stringify(babelResult.map));
  }

  await fs.rename("./static/index.css", "./static/_index.css");
  await fs.rename("./static/index.mjs", "./static/_index.mjs");
  await fs.writeFile("./static/index.css", extractedCSS);
  await fs.writeFile("./static/index.mjs", extractedJavaScript);
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
