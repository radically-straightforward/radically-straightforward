# Radically Straightforward · Package

**📦 Package a Node.js application**

## Installation

```console
$ npm install @radically-straightforward/package
```

## Usage

```
$ npx package --help
```

## Related Work

<details>
<summary><a href="https://npm.im/caxa"><code>caxa</code></a></summary>

`package` is the evolution of `caxa`.

The most notable difference between `caxa` and `package` is that `caxa` produces a binary that is a single file, while `package` produces a `.zip` (Windows) or a `.tar.gz` (macOS or Linux) containing a directory with the source code of the application and a shim executable. The principle behind the two is similar, because the binary produced by `caxa` is a self-extracting executable and what amounts to a shim executable, but there are some reasons to prefer the approach followed by `package`:

- `pacakge` is more straightforward and less magical. The self-extracting executable created by `caxa` relies on a stub executable written in another language (Go, or shell script, and so forth), and a tarball that is appended to the end of the this stub executable file (notably, appending data to the end of an executable doesn’t corrupt it, which is a strange property that holds in executable formats across Windows, macOS, and Linux). This magic is amusing, but brittle, and has unfortunate side-effects, for example, triggering anti-virus software.

- `caxa` has to extract the application from the binary. This is extra work that needs to happen on the first call to your application, which slows things down. And it’s non-trivial work too, which needs to take in account race conditions between multiple calls to the application, previously failed attempts of extraction, and so forth.

- `caxa` extracts the application into a temporary directory. This is advantageous because the temporary directory is usually cleaned on reboot, so previous versions of your application aren’t left behind cluttering the filesystem. But as it turns out some operating systems clean the temporary directory even during normal operation, and your application could be corrupted in the middle of operation.

- In macOS and Linux if you simply download an executable from the internet it doesn’t come with the permissions necessary to execute it—you must `chmod a+x example-application` first. Most applications sidestep this issue by distributing a tarball, which preserves the permissions upon extraction, but this defeats the point of the self-extracting executable produced by `caxa` in the first place.

`package` also improves upon `caxa` in a few other aspects:

- `package` is simpler to use. It provides fewer command-line options and sensible defaults. It doesn’t include obscure features of `caxa`, for example, the ability to generate a macOS Application Bundle (`.app`).

- In macOS and Linux, `package` calls the underlying application with `exec`, replacing the current process instead of creating a child process. This simplifies the process tree and solves issues related to forwarding signals. Unfortunately Windows doesn’t support `exec`, so a child process is still used in that case.

</details>

<details>
<summary><a href="https://npm.im/pkg"><code>pkg</code></a></summary>

The core issue with packaging Node.js applications into binaries are modules written in C/C++. The Node.js binary insists on loading those modules from the filesystem, so your application ends up having to be present in multiple files in the filesystem.

`pkg` sidesteps this issue by patching the Node.js binary. This solution produces an elegant output: a single binary for your application. Also, you may precompile your application into a V8 snapshot, which is faster to startup and allows for obfuscating the source code. But patching the Node.js binary has some disadvantages: it’s prone to errors (for example, issues related to ECMAScript modules), it needs to be updated when new versions of Node.js come out, it’s slow to build if you have to compile Node.js from scratch, and for some time `pkg` lagged behind Node.js releases.

</details>
