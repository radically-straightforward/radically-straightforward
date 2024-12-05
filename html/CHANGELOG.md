# Changelog

## Unreleased

- Changed `invalidXMLCharacters` to use the `u` flag instead of the `v` flag, because:
  - We don’t use the extended features provided by the `v` flag.
  - The syntax highlighter in Visual Studio Code works better with the `u` flag.
  - The `u` flag is better supported by old browsers.

## 1.0.0 · 2023-11-28

- Initial release, based on [`@leafac/html`](https://www.npmjs.com/package/@leafac/html).
