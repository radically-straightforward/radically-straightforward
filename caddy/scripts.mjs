import fs from "node:fs/promises";
import path from "node:path";
import got from "got";
import download from "download";

const directory = process.cwd().split(/[\\/]node_modules[\\/]/)[0];
switch (process.argv[2]) {
  case "postinstall":
    let version;
    try {
      version = JSON.parse(
        await fs.readFile(path.join(directory, "package.json"), "utf-8"),
      ).caddy;
    } catch {}
    if (version === undefined)
      version = (
        await got(
          "https://api.github.com/repos/caddyserver/caddy/releases/latest",
        ).json()
      ).tag_name.slice(1);

    await download(
      `https://github.com/caddyserver/caddy/releases/download/v${version}/caddy_${version}_${
        { win32: "windows", darwin: "mac", linux: "linux" }[process.platform]
      }_${{ x64: "amd64", arm64: "arm64", arm: "arm" }[process.arch]}${
        process.arch === "arm" ? `v${process.config.variables.arm_version}` : ""
      }.${process.platform === "win32" ? "zip" : "tar.gz"}`,
      path.join(directory, "node_modules/.bin/"),
      {
        extract: true,
        filter: (file) => file.path.includes("caddy"),
      },
    );
    break;

  case "preuninstall":
    await fs.rm(
      path.join(
        directory,
        `node_modules/.bin/caddy${process.platform === "win32" ? ".exe" : ""}`,
      ),
    );
    break;
}
