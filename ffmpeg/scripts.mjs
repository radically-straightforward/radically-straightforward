import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";

const installationDirectory = import.meta.dirname.split("/node_modules/")[0];

if (process.argv[2] === "postinstall") {
  let version;
  try {
    version = JSON.parse(
      await fs.readFile(
        path.join(installationDirectory, "package.json"),
        "utf-8",
      ),
    ).ffmpeg;
  } catch {}
  if (version === undefined)
    version = (
      await (
        await fetch(
          "https://github.com/radically-straightforward/radically-straightforward/raw/refs/heads/main/ffmpeg/package.json",
        )
      ).json()
    ).ffmpeg;

  const downloadDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "radically-straightforward--ffmpeg--"),
  );
  await fs.writeFile(
    path.join(
      downloadDirectory,
      `ffmpeg.${process.platform === "win32" ? "zip" : "tar.gz"}`,
    ),
    (
      await fetch(
        `https://github.com/radically-straightforward/radically-straightforward/releases/download/ffmpeg-binaries--v${version}/ffmpeg--${process.platform}--${process.arch}--v${version}.${process.platform === "win32" ? "zip" : "tar.gz"}`,
      )
    ).body,
  );
  await util.promisify(childProcess.execFile)(
    "tar",
    ["-xzf", `ffmpeg.${process.platform === "win32" ? "zip" : "tar.gz"}`],
    { cwd: downloadDirectory },
  );
  await fs.mkdir(path.join(installationDirectory, "node_modules/.bin/"), {
    recursive: true,
  });
  await fs.copyFile(
    path.join(
      downloadDirectory,
      `ffmpeg${process.platform === "win32" ? ".exe" : ""}`,
    ),
    path.join(
      installationDirectory,
      `node_modules/.bin/ffmpeg${process.platform === "win32" ? ".exe" : ""}`,
    ),
  );
  await fs.rm(downloadDirectory, { recursive: true, force: true });
} else if (process.argv[2] === "preuninstall")
  await fs.rm(
    path.join(
      installationDirectory,
      `node_modules/.bin/ffmpeg${process.platform === "win32" ? ".exe" : ""}`,
    ),
    { force: true },
  );
else throw new Error();
