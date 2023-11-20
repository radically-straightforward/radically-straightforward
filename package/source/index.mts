#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import * as fsStream from "node:fs";
import stream from "node:stream/promises";
import archiver from "archiver";

const directory = path.resolve();
const packageJSON = JSON.parse(
  await fs.readFile(path.join(directory, "package.json"), "utf-8"),
);
const name = packageJSON.name.replaceAll("@", "").replaceAll("/", "--");
const archive =
  process.platform === "win32"
    ? archiver("zip")
    : archiver("tar", { gzip: true });
const archiveStream = fsStream.createWriteStream(
  path.join(
    directory,
    `../${name}--${packageJSON.version}.${
      process.platform === "win32" ? "zip" : "tar.gz"
    }`,
  ),
);
archive.pipe(archiveStream);
archive.directory(directory, `${name}/${name}--source`);
await archive.finalize();
await stream.finished(archiveStream);
