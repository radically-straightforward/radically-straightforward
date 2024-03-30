import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";
import url from "node:url";
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

      const users = html\`<div css="\${css\`background-color:   pink;\`}" javascript="\${javascript\`console.log(  \${"Bye"}, \${"World"});\`}"></div><div css="\${css\`background-color: purple; &:hover { appearance: none; }\`}" javascript="\${javascript\`console.log("Users");\`}"></div>\`;
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
  await fs.writeFile("./static/example.txt", "Example");
  await fs.mkdir("./static/select-subdirectory/", { recursive: true });
  await fs.writeFile(
    "./static/select-subdirectory/select-subdirectory--example.txt",
    "Select subdirectory",
  );
  await fs.mkdir("./static/all-subdirectory/", { recursive: true });
  for (let index = 0; index < 5; index++)
    await fs.writeFile(
      `./static/all-subdirectory/all-subdirectory--example--${index}.txt`,
      `All subdirectory: ${index}`,
    );
  await fs.mkdir("./outside-static/", { recursive: true });
  await fs.writeFile(
    "./outside-static/outside-static--example.txt",
    "Outside static",
  );

  await util.promisify(childProcess.execFile)("node", [
    url.fileURLToPath(new URL("./index.mjs", import.meta.url)),
    "--file-to-copy-with-hash",
    "./static/example.txt",
    "--file-to-copy-with-hash",
    "./static/select-subdirectory/select-subdirectory--example.txt",
    "--file-to-copy-with-hash",
    "./static/all-subdirectory/",
    "--file-to-copy-with-hash",
    "./outside-static/outside-static--example.txt",
    "--file-to-copy-without-hash",
    "./static/example.txt",
    "--file-to-copy-without-hash",
    "./static/select-subdirectory/select-subdirectory--example.txt",
    "--file-to-copy-without-hash",
    "./static/all-subdirectory/",
    "--file-to-copy-without-hash",
    "./outside-static/outside-static--example.txt",
  ]);
  const paths = JSON.parse(
    await fs.readFile("./build/static/paths.json", "utf-8"),
  );

  assert.equal(
    await fs.readFile("./build/index.mjs", "utf-8"),
    'import html from "@radically-straightforward/html";\nconst template = html`<div css="${"feozrypenksece"}" javascript="${JSON.stringify({\n  function: "bgtlnytmxenlex",\n  arguments: ["Hello", "World"]\n})}"></div>`;\n//# sourceMappingURL=index.mjs.map',
  );
  assert.equal(
    await fs.readFile("./build/users.mjs", "utf-8"),
    'import html from "@radically-straightforward/html";\nconst users = html`<div css="${"feozrypenksece"}" javascript="${JSON.stringify({\n  function: "bgtlnytmxenlex",\n  arguments: ["Bye", "World"]\n})}"></div><div css="${"dxsfkgtqanuneb"}" javascript="${JSON.stringify({\n  function: "fxnzyekoinlefh",\n  arguments: []\n})}"></div>`;\n//# sourceMappingURL=users.mjs.map',
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["index.css"]),
      "utf-8",
    ),
    "p{background-color:#00f}body{background-color:red}[css~=feozrypenksece][css~=feozrypenksece][css~=feozrypenksece][css~=feozrypenksece][css~=feozrypenksece][css~=feozrypenksece]{background-color:pink}[css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb]{background-color:purple}[css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb][css~=dxsfkgtqanuneb]:hover{-webkit-appearance:none;appearance:none}\n/*# sourceMappingURL=index--ZNY57PGH.css.map */\n",
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["index.mjs"]),
      "utf-8",
    ),
    '(()=>{var e=hi="Hi";console.log(e);javascript?.execute?.functions?.set?.("bgtlnytmxenlex",async function(n,o,t){console.log(o,t)});javascript?.execute?.functions?.set?.("fxnzyekoinlefh",async function(n){console.log("Users")});})();\n//# sourceMappingURL=index--Y5KNWMCX.js.map\n',
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["example.txt"]),
      "utf-8",
    ),
    "Example",
  );
  assert.equal(
    await fs.readFile(
      path.join(
        "./build/static/",
        paths["select-subdirectory/select-subdirectory--example.txt"],
      ),
      "utf-8",
    ),
    "Select subdirectory",
  );
  for (let index = 0; index < 5; index++)
    assert.equal(
      await fs.readFile(
        path.join(
          "./build/static/",
          paths[`all-subdirectory/all-subdirectory--example--${index}.txt`],
        ),
        "utf-8",
      ),
      `All subdirectory: ${index}`,
    );
  assert.equal(
    await fs.readFile(
      path.join(
        "./build/static/",
        paths["outside-static/outside-static--example.txt"],
      ),
      "utf-8",
    ),
    "Outside static",
  );
  assert.equal(
    await fs.readFile("./build/static/example.txt", "utf-8"),
    "Example",
  );
  assert.equal(
    await fs.readFile(
      "./build/static/select-subdirectory/select-subdirectory--example.txt",
      "utf-8",
    ),
    "Select subdirectory",
  );
  for (let index = 0; index < 5; index++)
    assert.equal(
      await fs.readFile(
        `./build/static/all-subdirectory/all-subdirectory--example--${index}.txt`,
        "utf-8",
      ),
      `All subdirectory: ${index}`,
    );
  assert.equal(
    await fs.readFile(
      "./build/static/outside-static/outside-static--example.txt",
      "utf-8",
    ),
    "Outside static",
  );
});
