import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";

const installationDirectory = import.meta.dirname.split("/node_modules/")[0];

switch (process.argv[2]) {
  case "postinstall":
    let version;
    try {
      version = JSON.parse(
        await fs.readFile(
          path.join(installationDirectory, "package.json"),
          "utf-8",
        ),
      ).caddy;
    } catch {}
    if (version === undefined)
      version = (
        await (
          await fetch(
            "https://api.github.com/repos/caddyserver/caddy/releases/latest",
          )
        ).json()
      ).tag_name.slice(1);

    const downloadDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "radically-straightforward--caddy--"),
    );
    await fs.writeFile(
      path.join(
        downloadDirectory,
        `caddy.${process.platform === "win32" ? "zip" : "tar.gz"}`,
      ),
      (
        await fetch(
          `https://github.com/caddyserver/caddy/releases/download/v${version}/caddy_${version}_${
            { win32: "windows", darwin: "mac", linux: "linux" }[
              process.platform
            ]
          }_${{ x64: "amd64", arm64: "arm64", arm: "arm" }[process.arch]}${
            process.arch === "arm"
              ? `v${process.config.variables.arm_version}`
              : ""
          }.${process.platform === "win32" ? "zip" : "tar.gz"}`,
        )
      ).body,
    );
    await util.promisify(childProcess.execFile)(
      "tar",
      ["-xzf", `caddy.${process.platform === "win32" ? "zip" : "tar.gz"}`],
      { cwd: downloadDirectory },
    );
    await fs.mkdir(path.join(installationDirectory, "node_modules/.bin/"), {
      recursive: true,
    });
    await fs.copyFile(
      path.join(
        downloadDirectory,
        `caddy${process.platform === "win32" ? ".exe" : ""}`,
      ),
      path.join(
        installationDirectory,
        `node_modules/.bin/caddy${process.platform === "win32" ? ".exe" : ""}`,
      ),
    );
    await fs.rm(downloadDirectory, { recursive: true, force: true });
    break;

  case "preuninstall":
    await fs.rm(
      path.join(
        installationDirectory,
        `node_modules/.bin/caddy${process.platform === "win32" ? ".exe" : ""}`,
      ),
      { force: true },
    );
    break;
}
