# Radically Straightforward · TSConfig

**✅ TypeScript configuration**

## Installation

```console
$ npm install --save-dev @radically-straightforward/tsconfig
```

## Usage

`tsconfig.json`

```json
{
  "extends": "@radically-straightforward/tsconfig",
  "compilerOptions": {
    "rootDir": "./source/",
    "outDir": "./build/"
  }
}
```

## Related Work

### [`@sindresorhus/tsconfig`](https://www.npmjs.com/package/@sindresorhus/tsconfig)

Similar in spirit, but we make fewer decisions in terms of syntax (`noImplicitReturns`, `noImplicitOverride`, and so forth), we enable `isolatedModules` for [esbuild’s benefit](https://esbuild.github.io/content-types/#isolated-modules), and so forth.
