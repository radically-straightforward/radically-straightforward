import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";

test(async () => {
  process.chdir(
    await fs.mkdtemp(
      path.join(os.tmpdir(), "radically-straightforward--build--test--"),
    ),
  );
  // console.log(process.cwd());

  await fs.mkdir("./build/", { recursive: true });
  await fs.writeFile(
    "./build/index.mjs",
    javascript`
      import html from "@radically-straightforward/html";
      import css from "@radically-straightforward/css";
      import javascript from "@radically-straightforward/javascript";

      css\`
        @import "example-library/index.css";
        body {
          background-color: red;
        }
        .a {
          .b {
            @media (min-width: 400px) {
              background-color: light-dark(white, black);
            }
          }
        }
        \${["red", "green", "blue"].map(
          (color) => css\`
            .text--\${color} {
              color: \${color};
            }
          \`,
        )}
      \`;

      javascript\`
        import hi from "example-library/index.mjs";
        console.log(hi);
      \`;

      const template = html\`<div css="\${css\`background-color: pink;\`}" javascript="\${javascript\`console.log(\${"Hello"}, \${"World"});\`}"></div>\`;
    `,
  );
  await fs.writeFile(
    "./build/users.mjs",
    javascript`
      import html from "@radically-straightforward/html";
      import css from "@radically-straightforward/css";
      import javascript from "@radically-straightforward/javascript";

      () => {
        css\`
          .user {
            background-color: green;
          }
        \`;
  
        javascript\`
          console.log("Global users");
        \`;
      };

      const users = html\`<div css="\${css\`background-color:   \${"pink"};\`}" javascript="\${javascript\`console.log(  \${"Bye"}, \${"World"});\`}"></div><div css="\${css\`background-color: purple; &:hover { appearance: none; }\`}" javascript="\${javascript\`console.log("Users");\`}"></div>\`;
    `,
  );
  await fs.mkdir("./node_modules/example-library/", { recursive: true });
  await fs.writeFile(
    "./node_modules/example-library/index.css",
    css`
      p {
        background-color: blue;
      }
    `,
  );
  await fs.writeFile(
    "./node_modules/example-library/index.mjs",
    javascript`
      export default hi = "Hi";
    `,
  );
  await fs.mkdir("./static/", { recursive: true });
  await fs.writeFile("./static/favicon.ico", "Favicon");
  await fs.writeFile("./static/example.txt", "Example");
  await fs.mkdir("./static/subdirectory/", { recursive: true });
  await fs.writeFile("./static/subdirectory/subdirectory.txt", "Subdirectory");
  await fs.mkdir("./outside-static/", { recursive: true });
  await fs.writeFile("./outside-static/outside-static.txt", "Outside static");

  await util.promisify(childProcess.execFile)("node", [
    path.join(import.meta.dirname, "index.mjs"),
    "--copy-with-hash",
    "./outside-static/outside-static.txt",
    "--copy-without-hash",
    "./static/example.txt",
    "--copy-without-hash",
    "./outside-static/outside-static.txt",
  ]);
  const paths = JSON.parse(await fs.readFile("./build/static.json", "utf-8"));

  assert.equal(
    await fs.readFile("./build/index.mjs", "utf-8"),
    'import html from "@radically-straightforward/html";\nconst template = html`<div css="${"ezwcjopkwtcbnn"}" javascript="${JSON.stringify({\n  function: "cmbvnmdmzvywyz",\n  arguments: ["Hello", "World"]\n})}"></div>`;\n//# sourceMappingURL=index.mjs.map',
  );
  assert.equal(
    await fs.readFile("./build/users.mjs", "utf-8"),
    'import html from "@radically-straightforward/html";\n() => {};\nconst users = html`<div css="${"ezwcjopkwtcbnn"}" javascript="${JSON.stringify({\n  function: "cmbvnmdmzvywyz",\n  arguments: ["Bye", "World"]\n})}"></div><div css="${"cppvvoknyrtbnr"}" javascript="${JSON.stringify({\n  function: "dmkitzfcccjwfv",\n  arguments: []\n})}"></div>`;\n//# sourceMappingURL=users.mjs.map',
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["index.css"]),
      "utf-8",
    ),
    "@layer __RADICALLY_STRAIGHTFORWARD__GLOBAL__{p{background-color:#00f}body{background-color:red}@media (min-width: 400px){.a .b{--csstools-light-dark-toggle--0: var(--csstools-color-scheme--light) black;background-color:var(--csstools-light-dark-toggle--0, white);background-color:light-dark(white,black)}}.text--red{color:red}.text--green{color:green}.text--blue{color:#00f}.user{background-color:green}}@layer __RADICALLY_STRAIGHTFORWARD__INLINE__{@layer ezwcjopkwtcbnn{[css~=ezwcjopkwtcbnn]{background-color:pink}}@layer cppvvoknyrtbnr{[css~=cppvvoknyrtbnr]{background-color:purple}[css~=cppvvoknyrtbnr]:hover{-webkit-appearance:none;appearance:none}}}\n/*# sourceMappingURL=index--3EQP3BTO.css.map */\n",
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["index.mjs"]),
      "utf-8",
    ),
    '(()=>{var o=hi="Hi";console.log(o);console.log("Global users");javascript?.execute?.functions?.set?.("cmbvnmdmzvywyz",async function(c,e){console.log(c,e)});javascript?.execute?.functions?.set?.("dmkitzfcccjwfv",async function(){console.log("Users")});})();\n//# sourceMappingURL=index--HA65PULG.js.map\n',
  );
  assert.equal(
    await fs.readFile("./build/static/favicon.ico", "utf-8"),
    "Favicon",
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["example.txt"]),
      "utf-8",
    ),
    "Example",
  );
  assert.equal(
    await fs.readFile("./build/static/example.txt", "utf-8"),
    "Example",
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["subdirectory/subdirectory.txt"]),
      "utf-8",
    ),
    "Subdirectory",
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["outside-static/outside-static.txt"]),
      "utf-8",
    ),
    "Outside static",
  );
  assert.equal(
    await fs.readFile(
      "./build/static/outside-static/outside-static.txt",
      "utf-8",
    ),
    "Outside static",
  );
});
