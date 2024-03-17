import test from "node:test";
import assert from "node:assert/strict";
import javascript from "@radically-straightforward/javascript";
import prettier from "prettier";

test(async () => {
  assert.equal(
    await prettier.format(
      javascript`
        console.log(${["Hello World", 2]});
      `,
      { parser: "babel" },
    ),
    await prettier.format(
      `
        console.log(["Hello World", 2]);
      `,
      { parser: "babel" },
    ),
  );
});
