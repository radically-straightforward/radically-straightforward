import fs from "node:fs/promises";
import path from "node:path";
import childProcess from "node:child_process";
import util from "node:util";

let version;
try {
  version = JSON.parse(
    await fs.readFile(
      path.join(
        process.cwd().split(/[\\/]node_modules[\\/]/)[0],
        "package.json",
      ),
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

await fs.rm("node_modules/caddy/", { recursive: true, force: true });
await fs.mkdir("node_modules/caddy/", { recursive: true });
await fs.writeFile(
  `node_modules/caddy/caddy.${process.platform === "win32" ? "zip" : "tar.gz"}`,
  (
    await fetch(
      `https://github.com/caddyserver/caddy/releases/download/v${version}/caddy_${version}_${
        { win32: "windows", darwin: "mac", linux: "linux" }[process.platform]
      }_${{ x64: "amd64", arm64: "arm64", arm: "arm" }[process.arch]}${
        process.arch === "arm" ? `v${process.config.variables.arm_version}` : ""
      }.${process.platform === "win32" ? "zip" : "tar.gz"}`,
    )
  ).body,
);
await util.promisify(childProcess.execFile)(
  "tar",
  ["-xzf", `caddy.${process.platform === "win32" ? "zip" : "tar.gz"}`],
  {
    cwd: "node_modules/caddy/",
  },
);
await fs.rm(
  `node_modules/caddy/caddy.${process.platform === "win32" ? "zip" : "tar.gz"}`,
);
