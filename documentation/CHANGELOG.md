# Changelog

## Unreleased

- Removed the dependency on `execa` and `commander`.
- Switched dependencies from `@babel/parser` and `@babel/traverse` into `@babel/core`.

## 1.0.1 · 2023-11-28

- Changed the formatting to include a `;` by the end of the TypeScript block and satisfy Prettier.

## 1.0.0 · 2023-11-28

- Initial release.
- Basic TypeScript extraction functionality including:
  - `ExportDefaultDeclaration`
  - `ExportNamedDeclaration`
  - `FunctionDeclaration`
  - `VariableDeclaration`
  - `ClassDeclaration`
  - `TSTypeAliasDeclaration`
  - `ClassMethod`
  - `ClassProperty`
- Command line directive.
