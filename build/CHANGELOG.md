# Changelog

## 2.0.0 · 2024-06-08

- **Breaking Change:** Renamed command-line parameters `--file-to-copy-with-hash` and `--file-to-copy-without-hash` into `--copy-with-hash` and `--copy-without-hash`.
- Added defaults for globs `--file-to-copy-with-hash` and `--file-to-copy-without-hash`.

## 1.0.5 · 2024-06-03

- Silenced warning from PostCSS:

  > Without `from` option PostCSS could generate wrong source map and will not find Browserslist config. Set it to CSS file path or to `undefined` to prevent this warning.

## 1.0.4 · 2024-06-03

- Added support for CSS function `light-dark()` with [PostCSS Light Dark Function](https://github.com/csstools/postcss-plugins/tree/88bdf6b0a1411d863c43f6c1b990e09a300a8811/plugins/postcss-light-dark-function).

## 1.0.3 · 2024-05-01

- Update dependencies.

## 1.0.2 · 2024-04-09

- Removed the `define`d `process` from esbuild’s configuration. It led to issues with Tippy.js.

## 1.0.1 · 2024-04-01

- In esbuild, [`define`d](https://esbuild.github.io/api/#define) `process` to be `undefined`, which lets packages (for example, `@radically-straightforward/utilities`) differentiate between Node.js and the browser.

## 1.0.0 · 2024-03-31

- Initial release with support for extracting CSS and browser JavaScript, creating a bundle (with esbuild), and copying files adding hashes to their names.
