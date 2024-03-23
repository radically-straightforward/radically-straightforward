import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import build from "@radically-straightforward/build";

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

      const template = html\`<div css="\${css\`background-color: pink;\`}" javascript="\${javascript\`console.log("Hello");\`}"></div>\`;
    `,
  );
  await fs.writeFile(
    "./build/users.mjs",
    javascript`
      import html from "@radically-straightforward/html";
      import css from "@radically-straightforward/css";
      import javascript from "@radically-straightforward/javascript";

      const users = html\`<div css="\${css\`background-color: purple;\`}" javascript="\${javascript\`console.log("Users");\`}"></div>\`;
    `,
  );
  await fs.mkdir("./static/", { recursive: true });
  await fs.mkdir("./node_modules/example-library/", { recursive: true });
  await fs.writeFile(
    "./static/index.css",
    css`
      @import "example-library/index.css";
      body {
        background-color: red;
      }
    `,
  );
  await fs.writeFile(
    "./node_modules/example-library/index.css",
    css`
      p {
        background-color: blue;
      }
    `,
  );
  await fs.writeFile(
    "./static/index.mjs",
    javascript`
      import hi from "example-library/index.mjs";
      console.log(hi);
    `,
  );
  await fs.writeFile(
    "./node_modules/example-library/index.mjs",
    javascript`
      export default hi = "Hi";
    `,
  );
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

  await build({
    filesToCopyWithHash: [
      "./static/example.txt",
      "./static/select-subdirectory/select-subdirectory--example.txt",
      "./static/all-subdirectory/",
      "./outside-static/outside-static--example.txt",
    ],
    filesToCopyWithoutHash: [
      "./static/example.txt",
      "./static/select-subdirectory/select-subdirectory--example.txt",
      "./static/all-subdirectory/",
      "./outside-static/outside-static--example.txt",
    ],
  });

  const paths = JSON.parse(
    await fs.readFile("./build/static/paths.json", "utf-8"),
  );

  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["index.css"]),
      "utf-8",
    ),
    `p{background-color:#00f}body{background-color:red}[css~=zwnglzmxwdoiv][css~=zwnglzmxwdoiv][css~=zwnglzmxwdoiv][css~=zwnglzmxwdoiv][css~=zwnglzmxwdoiv][css~=zwnglzmxwdoiv]{background-color:pink}[css~=btplvzejmrgipw][css~=btplvzejmrgipw][css~=btplvzejmrgipw][css~=btplvzejmrgipw][css~=btplvzejmrgipw][css~=btplvzejmrgipw]{background-color:purple}\n/*# sourceMappingURL=index--X4UYHUQG.css.map */\n`,
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["index.mjs"]),
      "utf-8",
    ),
    `(()=>{var e=hi="Hi";console.log(e);radicallyStraightforward.execute.functions.set("ewvvepmpmoaytd",function(o){console.log("Hello")});radicallyStraightforward.execute.functions.set("hfuuqumuycblre",function(o){console.log("Users")});})();\n//# sourceMappingURL=index--66VQE2JB.js.map\n`,
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
