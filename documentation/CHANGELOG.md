# Changelog

## 1.0.4 · 2024-03-23

- Removed an explicit dependency on `@babel/types` in favor of `@babel/core`.

## 1.0.3 · 2024-03-23

- Fixed an issue in which an `await` was missing.

## 1.0.2 · 2024-03-23

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
