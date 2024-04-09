import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";

if (url.fileURLToPath(import.meta.url).includes("/node_modules/"))
  await fs.writeFile(
    path.join(
      url.fileURLToPath(import.meta.url).split("/node_modules/")[0],
      "tsconfig.json",
    ),
    `{
  "extends": "@radically-straightforward/tsconfig",
  "compilerOptions": {
    "rootDir": "./source/",
    "outDir": "./build/"
  }
}
`,
  );
