import path from "node:path";
import fs from "node:fs/promises";

if (process.cwd().includes("/node_modules/"))
  await fs.writeFile(
    path.join(
      process.cwd().split(new RegExp("/node_modules/"))[0],
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
