import test from "node:test";
import assert from "node:assert/strict";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";

test(async () => {
  assert.equal(
    css`
      body {
        background-color: ${"red"};
      }

      p {
        background-image: url("data:image/svg+xml,${encodeURIComponent(html`
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <rect fill="#f00" x="8" y="8" width="1" height="1" />
          </svg>
        `)}");
      }

      ${["red", "green", "blue"].map(
        (color) => css`
          .text--${color} {
            color: ${color};
          }
        `,
      )}
    `,
    '\n      body {\n        background-color: red;\n      }\n\n      p {\n        background-image: url("data:image/svg+xml,%0A%20%20%20%20%20%20%20%20%20%20%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20fill%3D%22%23f00%22%20x%3D%228%22%20y%3D%228%22%20width%3D%221%22%20height%3D%221%22%20%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C%2Fsvg%3E%0A%20%20%20%20%20%20%20%20");\n      }\n\n      \n          .text--red {\n            color: red;\n          }\n        \n          .text--green {\n            color: green;\n          }\n        \n          .text--blue {\n            color: blue;\n          }\n        \n    ',
  );
});
