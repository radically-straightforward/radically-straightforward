import url from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

export default JSON.parse(
  await fs.readFile(
    path.join(
      url
        .fileURLToPath(new URL(".", import.meta.url))
        .split("/node_modules/")[0],
      "./build/static.json",
    ),
    "utf-8",
  ),
);
