# Changelog

- Added automatic resource management.

## 1.1.0 · 2024-04-29

- Introduced better defaults that avoid the `SQLITE_BUSY` error.

## 1.0.0 · 2024-01-30

- Initial release, based on [`@leafac/sqlite`](https://www.npmjs.com/package/@leafac/sqlite), including the following breaking changes:
  - `migrate()` now sets `journal_mode` to WAL.
  - Added a type parameter to `pragma<Type>()`.
  - Removed the `safeIntegers` option, which would apply at the level of statements. If necessary, set it at the database level with [`database.defaultSafeIntegers()`](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/integer.md#getting-bigints-from-the-database), or get a hold of a particular statement with `database.getStatement()`.
