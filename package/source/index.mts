#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";
import * as fsStream from "node:fs";
import stream from "node:stream/promises";
import archiver from "archiver";
import batch from "dedent";
import sh from "dedent";

let {
  values: { input },
  positionals: command,
} = util.parseArgs({
  options: {
    input: {
      type: "string",
      short: "i",
      default: ".",
    },
  },
  allowPositionals: true,
});
input = path.resolve(input!);
if (command.length === 0)
  command = ["$PACKAGE/node_modules/.bin/node", "$PACKAGE/build/index.mjs"];

await util.promisify(childProcess.execFile)("npm", ["dedupe"], {
  cwd: input,
  env: { ...process.env, NODE_ENV: "production" },
});

await fs.mkdir(path.join(input, "node_modules/.bin"), { recursive: true });
await fs.cp(
  process.execPath,
  path.join(input, "node_modules/.bin", path.basename(process.execPath)),
);

const archive =
  process.platform === "win32"
    ? archiver("zip")
    : archiver("tar", { gzip: true });
const archiveStream = fsStream.createWriteStream(
  path.join(
    input,
    `../${path.basename(input)}.${
      process.platform === "win32" ? "zip" : "tar.gz"
    }`,
  ),
);
archive.pipe(archiveStream);
archive.directory(
  input,
  `${path.basename(input)}/${path.basename(input)}--source`,
);
if (process.platform === "win32")
  archive.append(
    batch`
      @echo off
      set PACKAGE=%~dp0${path.basename(input)}--source
      ${command
        .map(
          (commandPart) =>
            `"${commandPart.replaceAll("$PACKAGE", "%PACKAGE%")}"`,
        )
        .join(" ")} %*
    `,
    { name: `${path.basename(input)}/${path.basename(input)}.cmd` },
  );
else
  archive.append(
    sh`
      #!/usr/bin/env sh
      export PACKAGE="$(dirname "$0")/${path.basename(input)}--source"
      exec ${command.map((commandPart) => `"${commandPart}"`).join(" ")} "$@"
    `,
    {
      name: `${path.basename(input)}/${path.basename(input)}`,
      mode: 0o755,
    },
  );
await archive.finalize();
await stream.finished(archiveStream);
