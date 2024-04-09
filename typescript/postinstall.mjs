import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";

const tsconfig = path.join(
  url.fileURLToPath(new URL(".", import.meta.url)).split("/node_modules/")[0],
  "tsconfig.json",
);
if ((await fs.access(tsconfig).catch(() => false)) === false)
  await fs.writeFile(
    tsconfig,
    `{
  "extends": "@radically-straightforward/typescript",
  "compilerOptions": {
    "rootDir": "./source/",
    "outDir": "./build/"
  }
}
`,
  );
