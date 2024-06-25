import test from "node:test";
import fs from "node:fs/promises";
import * as examples from "./index.mjs";

test(() => {
  console.log(examples.text());
});
