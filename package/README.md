# Radically Straightforward · Package

**📦 Package a Node.js application**

## Installation

```console
$ npm install --save-dev @radically-straightforward/package
```

## Usage

First, prepare your application for packaging. This may include running `npm ci`, `npm run prepare`, and so forth. You may also want to remove directories and files that shouldn’t be distributed, for example, `.git`, `.env`, and so forth.

> **Note:** You don’t need to remove development dependencies from the `node_modules/` directory because `@radically-straightforward/package` does that for you by running `env NODE_ENV=production npm dedupe` in the process of packaging.

Ensure that your application works when you run it using the following command:

```console
$ node ./build/index.mjs
```

> **Note:** If you need to run some other command to start your application, then create a startup script at `./build/index.mjs`.

Then, use `@radically-straightforward/package` to produce a package for distribution, for example:

```console
$ npx package
```

The package will be available as a sibling of the application directory, for example:

- `example-application/`
- `example-application.zip`(Windows) or `example-application.tar.gz` (macOS or Linux)

When extracted, the package includes an executable entrypoint and the application source code, for example:

- `example-application/example-application.cmd`(Windows) or `example-application/example-application` (macOS or Linux)
- `example-application/_/`

And the following is an example of calling the application in macOS or Linux:

```console
$ ./example-application/example-application examples of some extra command-line arguments
```

## How It Works

First `@radically-straightforward/package` cleans up development dependencies and duplicate dependencies with `env NODE_ENV=production npm dedupe`.

Then `@radically-straightforward/package` copies the Node.js binary with which it was executed into the `node_modules/.bin/` directory, where npm installs binaries of dependencies.

Finally `@radically-straightforward/package` creates a `.zip` (Windows) or a `.tar.gz` (macOS or Linux) file including your application’s source code and a shim executable. The shim executable starts your application and forwards command-line arguments, environment variables, standard input/output, signals, and return code.

> **Note:** The `$PACKAGE` environment variable is set to the directory containing your application.

## Related Work

### [`caxa`](https://www.npmjs.com/package/caxa)

`@radically-straightforward/package` is the evolution of `caxa`.

The most notable difference between `caxa` and `@radically-straightforward/package` is that `caxa` produces a binary which is a single file, while `@radically-straightforward/package` produces a `.zip` (Windows) or a `.tar.gz` (macOS or Linux) containing a directory with the source code of the application and a shim executable. The principle behind the two is similar, because the binary produced by `caxa` is a self-extracting executable and what amounts to a shim executable, but there are some reasons to prefer the approach followed by `@radically-straightforward/package`:

- `@radically-straightforward/package` is more straightforward and less magical. The self-extracting executable created by `caxa` relies on a stub executable written in another language (Go, or shell script, and so forth), and a tarball that is appended to the end of the this stub executable file (notably, appending data to the end of an executable doesn’t corrupt it, which is a strange property that holds in executable formats across Windows, macOS, and Linux). This magic is amusing, but brittle, and has unfortunate side-effects, for example, triggering anti-virus software and complicating signing and notarization.

- `caxa` has to extract the application from the binary. This is extra work that needs to happen on the first call to your application, which slows things down. And it’s non-trivial work too, which needs to take in account race conditions between multiple calls to the application, previously failed attempts of extraction, and so forth.

- `caxa` extracts the application into a temporary directory. This is advantageous because the temporary directory is usually cleaned on reboot, so previous versions of your application aren’t left behind cluttering the filesystem. But as it turns out some operating systems clean the temporary directory even during normal operation, and your application could be corrupted in the middle of operation.

- In macOS and Linux if you simply download an executable from the internet it doesn’t come with the permissions necessary to execute it—you must `chmod a+x example-application` first. Most applications solve this issue by distributing a tarball, which preserves the permissions of executables upon extraction, but this defeats the point of the self-extracting executable produced by `caxa` in the first place.

`@radically-straightforward/package` also improves upon `caxa` in a few other aspects:

- `@radically-straightforward/package` is simpler to use. It provides sensible defaults instead of asking for several command-line arguments. It doesn’t include obscure features of `caxa`, for example, the ability to generate a macOS Application Bundle (`.app`), and the ability to package from JavaScript as opposed to the command-line.

- In macOS and Linux, `@radically-straightforward/package` calls the underlying application with `exec`, replacing the current process instead of creating a child process. This simplifies the process tree and solves issues related to forwarding signals. Unfortunately Windows doesn’t support `exec`, so a child process is still used in that case.

### [`pkg`](https://www.npmjs.com/package/pkg)

The core issue with packaging Node.js applications into binaries are modules written in C/C++. The Node.js binary insists on loading those modules from the filesystem, so your application ends up having to be present as multiple files in the filesystem.

`pkg` solves this issue by patching the Node.js binary. This solution produces an elegant output: a single binary for your application. Also, you may precompile your application into a V8 snapshot, which is faster to startup and allows for obfuscating the source code. But patching the Node.js binary has some disadvantages: it’s prone to errors (for example, issues related to ECMAScript modules), it needs to be updated when new versions of Node.js come out, it’s slow to build if you have to compile Node.js from scratch, and for some time `pkg` lagged behind Node.js releases.
