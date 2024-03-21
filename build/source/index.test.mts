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

  await fs.mkdir("./static/");
  await fs.writeFile("./static/index.css", css``);
  await fs.writeFile("./static/index.mjs", javascript``);
  await fs.writeFile("./static/example.txt", "Example");
  await fs.mkdir("./static/select-subdirectory/");
  await fs.writeFile(
    "./static/select-subdirectory/select-subdirectory--example.txt",
    "Select subdirectory",
  );
  await fs.mkdir("./static/all-subdirectory/");
  for (let index = 0; index < 5; index++)
    await fs.writeFile(
      `./static/all-subdirectory/all-subdirectory--example--${index}.txt`,
      `All subdirectory: ${index}`,
    );
  await fs.mkdir("./outside-static/");
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
    css``,
  );
  assert.equal(
    await fs.readFile(
      path.join("./build/static/", paths["index.mjs"]),
      "utf-8",
    ),
    javascript``,
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
