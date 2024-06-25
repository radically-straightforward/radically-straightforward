import fs from "node:fs/promises";
import generateText from "./index.mjs";

console.log(
  generateText(
    JSON.parse(
      await fs.readFile(
        new URL("../example/model.json", import.meta.url),
        "utf-8"
      )
    ),
    10
  )
);
