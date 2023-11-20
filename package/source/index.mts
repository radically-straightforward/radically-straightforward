#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import * as fsStream from "node:fs";
import stream from "node:stream/promises";
import * as commander from "commander";
import { execa } from "execa";
import archiver from "archiver";
import dedent from "dedent";
import sh from "dedent";

const packageJSON = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf-8"),
);

await commander.program
  .name("package")
  .description(packageJSON.description)
  .option("-i, --input <input>", "The application directory.", ".")
  .argument(
    "[command...]",
    "The command to start the application. The ‘$PACKAGE’ environment variable contains the path to the application directory. The Node.js binary is available at ‘$PACKAGE/node_modules/.bin/node’, along with other binaries installed by npm. The default command expects the application entrypoint to be at ‘$PACKAGE/build/index.mjs’.",
    ["$PACKAGE/node_modules/.bin/node", "$PACKAGE/build/index.mjs"],
  )
  .version(packageJSON.version)
  .addHelpText(
    "after",
    "\n" +
      dedent`
        First, prepare the application for packaging. This may include running ‘npm install’, ‘npm run prepare’, and so forth.

        Then, use ‘package’ to produce a package for distribution, for example:
        
          $ npx package

          Or:

          $ npx package --input "path-to-project" -- "$PACKAGE/node_modules/.bin/node" "$PACKAGE/path-to-entrypoint.mjs"

        Note: The process of packaging includes a call to ‘env NODE_ENV=production npm dedupe’, which removes development dependencies from the ‘node_modules/’ directory.
        
        The package will be available as a sibling of the application directory, for example:

          - example-application/
          - example-application.tar.gz
        
        When extracted, the package includes an entrypoint binary and the application source code, for example:

          - example-application/example-application
          - example-application/example-application--source/

        Example of calling the binary:

          $ ./example-application/example-application examples of some extra command-line arguments
      `,
  )
  .allowExcessArguments(false)
  .showHelpAfterError()
  .action(async (command: string[], { input }: { input: string }) => {
    input = path.resolve(input);

    await execa("npm", ["dedupe"], {
      cwd: input,
      env: { NODE_ENV: "production" },
      stdio: "inherit",
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
  })
  .parseAsync();
