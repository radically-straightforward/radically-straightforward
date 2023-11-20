<!--
## TODO

- Let `package.json` specify a version range? It seems like a nice feature to have, but it means we’d have to introduce a dependency to resolve the ranges, and we’d have to implement some form of locking logic. It doesn’t seem to be worth it.
-->

# Radically Straightforward · Caddy

**🔒 Install [Caddy](https://caddyserver.com/) as an npm package**

## Installation

```console
$ npm install @radically-straightforward/caddy
```

> **Note:** For quick-and-easy testing you may run Caddy from the command line with `npx` instead of installing it explicitly:
>
> ```console
> $ npx @radically-straightforward/caddy
> ```

> **Note:** By default the latest version of Caddy is installed. You may specify a version in `package.json` with a `caddy` property, for example:
>
> `package.json`
>
> ```json
> {
>   "caddy": "2.7.5"
> }
> ```

> **Note:** The Caddy binary is installed under `node_modules/.bin/`, along with other binaries for npm packages.

## Usage

```console
$ npx caddy
```

> **Note:** If the command above doesn’t work, which may happen in particular on Windows, use the path to the binary instead of `npx`:
>
> ```console
> > .\node_modules\.bin\caddy
> ```

## Related Work

**[`caddy-npm`](https://npm.im/caddy-npm)**

Only supports specific versions of Caddy and requires an update to the package itself when a new version of Caddy is released. At the time of this writing (2023-11-14) the latest supported version is Caddy 2.1.1 from 2020-06-20 (more than three years old).

`@radically-straightforward/caddy`, on the other hand, supports new versions of Caddy as soon as they’re released.
