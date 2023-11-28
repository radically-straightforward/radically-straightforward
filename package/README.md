# Radically Straightforward · Package

**📦 Package a Node.js application**

## Installation

```console
$ npm install --save-dev @radically-straightforward/package
```

## Usage

Prepare the application for packaging. This may include running `npm ci`, `npm run prepare`, and so forth. You may also want to remove directories and files that shouldn’t be part of the package, for example, `.git`, `.env`, and so forth.

Then, use `package` to produce a package for distribution, for example:

```console
$ npx package
```

or:

```console
$ npx package --input "path-to-project" -- "$PACKAGE/node_modules/.bin/node" "$PACKAGE/path-to-entrypoint.mjs"
```

> **Note:** The process of packaging includes a call to `env NODE_ENV=production npm dedupe`, which removes development dependencies from the `node_modules/` directory.

The package will be available as a sibling of the application directory, for example:

- `example-application/`
- `example-application.tar.gz`

When extracted, the package includes an entrypoint binary and the application source code, for example:

- `example-application/example-application`
- `example-application/example-application--source/`

Example of calling the binary:

```console
$ ./example-application/example-application examples of some extra command-line arguments
```

## `$ npx package --help`

<!-- DOCUMENTATION START: $ node ./build/index.mjs --help -->

```
Usage: package [options] [command...]

📦 Package a Node.js application

Arguments:
  command              The command to start the application. The ‘$PACKAGE’
                       environment variable contains the path to the
                       application directory. On Windows the ‘$PACKAGE’ syntax
                       is converted into ‘%PACKAGE%’ automatically. The Node.js
                       binary is available at
                       ‘$PACKAGE/node_modules/.bin/node’, along with other
                       binaries installed by npm. The default command expects
                       the application entrypoint to be at
                       ‘$PACKAGE/build/index.mjs’. (default:
                       ["$PACKAGE/node_modules/.bin/node","$PACKAGE/build/index.mjs"])

Options:
  -i, --input <input>  The application directory. (default: ".")
  -V, --version        output the version number
  -h, --help           display help for command
```

<!-- DOCUMENTATION END: $ node ./build/index.mjs --help -->

## How It Works

First `package` cleans up development dependencies and duplicate dependencies with `env NODE_ENV=production npm dedupe`.

Then `package` copies the Node.js binary with which it was executed into the `node_modules/.bin/` directory, where npm installs binaries for dependencies.

Finally `package` creates a `.zip` (Windows) or a `.tar.gz` (macOS or Linux) including your application’s source code and a shim executable. The shim executable starts your application with the startup command that you provide and sets up the following:

- Absolute paths for starting up the application. You may call the shim executable from any directory, because the paths to the entrypoint of the application are absolute. This is done with the `$PACKAGE` environment variable, which is set to the directory in which the package has been extracted.

- Command-line arguments. The command-line arguments with which the shim executable is called are forwarded to the underlying command that you configured when packaging. For example, if when packaging you configured the startup command to be `"$PACKAGE/node_modules/.bin/node" "$PACKAGE/build/index.mjs"` (the default), and you call the shim executable as `./example-application/example-application examples of some extra command-line arguments`, then the underlying application is called as `"$PACKAGE/node_modules/.bin/node" "$PACKAGE/build/index.mjs" "examples" "of" "some" "extra" "command-line" "arguments"`.

- Environment variables, standard input/output, signals and return code are forwarded into and out of the underlying application.

## Related Work

### [`caxa`](https://npm.im/caxa)

`package` is the evolution of `caxa`.

The most notable difference between `caxa` and `package` is that `caxa` produces a binary which is a single file, while `package` produces a `.zip` (Windows) or a `.tar.gz` (macOS or Linux) containing a directory with the source code of the application and a shim executable. The principle behind the two is similar, because the binary produced by `caxa` is a self-extracting executable and what amounts to a shim executable, but there are some reasons to prefer the approach followed by `package`:

- `package` is more straightforward and less magical. The self-extracting executable created by `caxa` relies on a stub executable written in another language (Go, or shell script, and so forth), and a tarball that is appended to the end of the this stub executable file (notably, appending data to the end of an executable doesn’t corrupt it, which is a strange property that holds in executable formats across Windows, macOS, and Linux). This magic is amusing, but brittle, and has unfortunate side-effects, for example, triggering anti-virus software and prevent signing and notarization.

- `caxa` has to extract the application from the binary. This is extra work that needs to happen on the first call to your application, which slows things down. And it’s non-trivial work too, which needs to take in account race conditions between multiple calls to the application, previously failed attempts of extraction, and so forth.

- `caxa` extracts the application into a temporary directory. This is advantageous because the temporary directory is usually cleaned on reboot, so previous versions of your application aren’t left behind cluttering the filesystem. But as it turns out some operating systems clean the temporary directory even during normal operation, and your application could be corrupted in the middle of operation.

- In macOS and Linux if you simply download an executable from the internet it doesn’t come with the permissions necessary to execute it—you must `chmod a+x example-application` first. Most applications solve this issue by distributing a tarball, which preserves the permissions of executables upon extraction, but this defeats the point of the self-extracting executable produced by `caxa` in the first place.

`package` also improves upon `caxa` in a few other aspects:

- `package` is simpler to use. It provides fewer command-line options and sensible defaults. It doesn’t include obscure features of `caxa`, for example, the ability to generate a macOS Application Bundle (`.app`), and the ability to package from JavaScript as opposed to the command-line.

- In macOS and Linux, `package` calls the underlying application with `exec`, replacing the current process instead of creating a child process. This simplifies the process tree and solves issues related to forwarding signals. Unfortunately Windows doesn’t support `exec`, so a child process is still used in that case.

### [`pkg`](https://npm.im/pkg)

The core issue with packaging Node.js applications into binaries are modules written in C/C++. The Node.js binary insists on loading those modules from the filesystem, so your application ends up having to be present as multiple files in the filesystem.

`pkg` solves this issue by patching the Node.js binary. This solution produces an elegant output: a single binary for your application. Also, you may precompile your application into a V8 snapshot, which is faster to startup and allows for obfuscating the source code. But patching the Node.js binary has some disadvantages: it’s prone to errors (for example, issues related to ECMAScript modules), it needs to be updated when new versions of Node.js come out, it’s slow to build if you have to compile Node.js from scratch, and for some time `pkg` lagged behind Node.js releases.
