import test from "node:test";
import assert from "node:assert/strict";
import css, { CSS } from "./index.mjs";
import prettier from "prettier";

test(async () => {
  assert.equal(
    await prettier.format(
      css`
        body {
          background-color: red;
        }

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
        body {
          background-color: red;
        }

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
