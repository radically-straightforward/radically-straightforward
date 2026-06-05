import path from "node:path";
import fs from "node:fs/promises";

const tsconfig = path.join(
  import.meta.dirname.split(`${path.sep}node_modules${path.sep}`)[0],
  "tsconfig.json",
);
if ((await fs.access(tsconfig).catch(() => false)) === false)
  await fs.writeFile(
    tsconfig,
    `{
  "extends": "@radically-straightforward/typescript",
  "include": ["source/**/*"],
  "compilerOptions": {
    "rootDir": "./source/",
    "outDir": "./build/"
  }
}
`,
  );
