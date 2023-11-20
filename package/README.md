# Radically Straightforward · Package

**📦 Package a Node.js application**

## Installation

```console
$ npm install @radically-straightforward/package
```

## Usage

```
Usage: package [options] [command...]

📦 Package a Node.js application

Arguments:
  command              The command to start the application. The ‘$PACKAGE’ environment variable contains the path to the application directory. The Node.js binary is available at ‘$PACKAGE/node_modules/.bin/node’, along with other binaries installed by npm.
                       The default command expects the application entrypoint to be at ‘$PACKAGE/build/index.mjs’. (default: ["$PACKAGE/node_modules/.bin/node","$PACKAGE/build/index.mjs"])

Options:
  -i, --input <input>  The application directory. (default: ".")
  -V, --version        output the version number
  -h, --help           display help for command

First, prepare the application for packaging. This may include running ‘npm install’, ‘npm run prepare’, and so forth.

Then, use ‘package’ to produce a package for distribution, for example:

  $ npx package

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
leafac@leafac--macbook package % npm run prepare && node ./build/index.mjs --help

> @radically-straightforward/package@1.0.0 prepare
> tsc

Usage: package [options] [command...]

📦 Package a Node.js application

Arguments:
  command              The command to start the application. The ‘$PACKAGE’ environment variable contains the path to the application directory. The Node.js binary is available at ‘$PACKAGE/node_modules/.bin/node’, along with other binaries installed by npm.
                       The default command expects the application entrypoint to be at ‘$PACKAGE/build/index.mjs’. (default: ["$PACKAGE/node_modules/.bin/node","$PACKAGE/build/index.mjs"])

Options:
  -i, --input <input>  The application directory. (default: ".")
  -V, --version        output the version number
  -h, --help           display help for command

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
```

## Related Work

**[`caxa`](https://npm.im/caxa)**
