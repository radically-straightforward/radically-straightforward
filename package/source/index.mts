#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import * as fsStream from "node:fs";
import stream from "node:stream/promises";
import { execa } from "execa";
import archiver from "archiver";

const directory = path.resolve();
const name = JSON.parse(
  await fs.readFile(path.join(directory, "package.json"), "utf-8"),
)
  .name.replaceAll("@", "")
  .replaceAll("/", "--");

await execa("npm", ["dedupe"], {
  cwd: directory,
  env: { NODE_ENV: "production" },
  stdio: "inherit",
});

await fs.mkdir(path.join(directory, "node_modules/.bin"), { recursive: true });
await fs.cp(
  process.execPath,
  path.join(directory, "node_modules/.bin", path.basename(process.execPath)),
);

const archive =
  process.platform === "win32"
    ? archiver("zip")
    : archiver("tar", { gzip: true });
const archiveStream = fsStream.createWriteStream(
  path.join(
    directory,
    `../${name}.${process.platform === "win32" ? "zip" : "tar.gz"}`,
  ),
);
archive.pipe(archiveStream);
archive.directory(directory, `${name}/${name}--source`);
await archive.finalize();
await stream.finished(archiveStream);
