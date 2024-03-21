import path from "node:path";
import fs from "node:fs/promises";
import { globby } from "globby";
import babel from "@babel/core";
import babelGenerator from "@babel/generator";
import esbuild from "esbuild";
import xxhash from "xxhash-addon";
import baseX from "base-x";
import css, { CSS } from "@radically-straightforward/css";
import javascript, { JavaScript } from "@radically-straightforward/javascript";

export default async function build({
  filesToCopyWithHash = [],
  filesToCopyWithoutHash = [],
}: {
  filesToCopyWithHash?: string[];
  filesToCopyWithoutHash?: string[];
}): Promise<void> {
  let compiledCSS = css``;
  let compiledJavaScript = javascript``;

  const cssIdentifiers = new Set();
  const javascriptIdentifiers = new Set();
  const baseIdentifier = baseX("abcdefghijklmnopqrstuvwxyz");
  for (const input of await globby("./source/**/*.mts")) {
    const output = path.join(
      "./build",
      `${input.slice("./source/".length, -path.extname(input).length)}.mjs`,
    );

    const code = await fs.readFile(input, "utf-8");

    const babelResult = await babel.transformFromAstAsync(
      (
        await babel.transformAsync(code, {
          filename: input,
          ast: true,
          code: false,
          presets: ["@babel/preset-typescript"],
        })
      ).ast,
      code,
      {
        filename: input,
        sourceMaps: true,
        sourceFileName: path.relative(path.dirname(output), input),
        cloneInputAst: false,
        compact: false,
        plugins: [
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
                      compiledCSS += css`/********************************************************************************/\n\n${`[css~="${identifier}"]`.repeat(
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
                      compiledJavaScript += javascript`/********************************************************************************/\n\nleafac.execute.functions.set("${identifier}", function (${[
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

    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(
      output,
      `${babelResult.code}\n//# sourceMappingURL=${path.basename(output)}.map`,
    );
    await fs.writeFile(`${output}.map`, JSON.stringify(babelResult.map));
  }

  // compiledCSS = (
  //   await postcss([postcssNested, autoprefixer]).process(compiledCSS, {
  //     from: undefined,
  //   })
  // ).css;

  // await fs.writeFile("./static/index.css", compiledCSS);
  // await fs.writeFile("./static/index.mjs", compiledJavaScript);

  // const esbuildResult = await esbuild.build({
  //   absWorkingDir: path.resolve("./static/"),
  //   entryPoints: ["./index.mjs"],
  //   outdir: "../build/static/",
  //   entryNames: "[dir]/[name]--[hash]",
  //   assetNames: "[dir]/[name]--[hash]",

  //   loader: {
  //     ".woff2": "file",
  //     ".woff": "file",
  //     ".ttf": "file",
  //   },

  //   target: ["chrome100", "safari14", "edge100", "firefox100", "ios14"],

  //   bundle: true,
  //   minify: true,
  //   sourcemap: true,
  //   metafile: true,
  // });

  // await fs.rm("./static/index.css");
  // await fs.rm("./static/index.mjs");

  const paths: { [key: string]: string } = {};

  // for (const [javascriptBundle, { entryPoint, cssBundle }] of Object.entries(
  //   esbuildResult.metafile.outputs,
  // ))
  //   if (entryPoint === "index.mjs" && typeof cssBundle === "string") {
  //     paths["index.css"] = cssBundle.slice("../build/static/".length);
  //     paths["index.mjs"] = javascriptBundle.slice("../build/static/".length);
  //     break;
  //   }

  for (const source of await globby(filesToCopyWithHash)) {
    const extension = path.extname(source);
    const destination = path.join(
      "./build/static/",
      `${source.replace(new RegExp("^(?:\\./)?(?:static/)?"), "").slice(0, -extension.length)}--${baseFileHash.encode(
        xxhash.XXHash3.hash(await fs.readFile(source)),
      )}${extension}`,
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

const baseFileHash = baseX("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
