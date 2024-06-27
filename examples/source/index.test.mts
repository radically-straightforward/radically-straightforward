import test from "node:test";
import * as examples from "./index.mjs";

test(() => {
  for (let nameIndex = 0; nameIndex < 10; nameIndex++)
    console.log(examples.name());
  console.log(examples.text());
});
