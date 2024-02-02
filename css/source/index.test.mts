import test from "node:test";
import assert from "node:assert/strict";
import css from "./index.mjs";
import prettier from "prettier";

test(async () => {
  assert.equal(
    await prettier.format(
      css`
        body {
          background-color: ${"red"};
        }
      `,
      { parser: "css" },
    ),
    await prettier.format(
      `
        body {
          background-color: red;
        }
      `,
      { parser: "css" },
    ),
  );

  assert.equal(
    await prettier.format(
      css`
        ${["red", "green", "blue"].map(
          (color) => css`
            .text--${color} {
              color: ${color};
            }
          `,
        )}
      `,
      { parser: "css" },
    ),
    await prettier.format(
      `
        .text--red {
          color: red;
        }
      
        .text--green {
          color: green;
        }
      
        .text--blue {
          color: blue;
        }
      `,
      { parser: "css" },
    ),
  );
});
