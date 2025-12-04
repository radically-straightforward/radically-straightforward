# Radically Straightforward · TypeScript

**✅ TypeScript configuration**

## Installation

```console
$ npm install --save-dev @radically-straightforward/typescript
```

## Usage

`tsconfig.json`

```json
{
  "extends": "@radically-straightforward/typescript",
  "include": ["source/**/*"],
  "compilerOptions": {
    "rootDir": "./source/",
    "outDir": "./build/"
  }
}
```

> **Note:** The installation of `@radically-straightforward/typescript` should create `tsconfig.json` in the appropriate location.

## Related Work

### [`@sindresorhus/tsconfig`](https://www.npmjs.com/package/@sindresorhus/tsconfig)

Similar in spirit, but we make fewer decisions in terms of syntax (`noImplicitReturns`, `noImplicitOverride`, and so forth), we enable `isolatedModules` for [esbuild’s benefit](https://esbuild.github.io/content-types/#isolated-modules), and so forth.
