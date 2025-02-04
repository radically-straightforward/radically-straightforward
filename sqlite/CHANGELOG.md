# Changelog

## 1.1.7 · 2025-02-04

- **Breaking change:** Changed `cache()` to be synchronous, similar to other database operations, and added `cacheAsync()`.

## 1.1.6 · 2024-10-09

- Added `cache()`.

## 1.1.5 · 2024-06-21

- In `migrate()`, removed [step 10](https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes). If you wish to perform that check, you may do so in your migration, but we don’t do it by default because it’s slow in big databases.

## 1.1.4 · 2024-06-03

- In `` sql`___` ``, replaced the runtime type check with a TypeScript type.

## 1.1.3 · 2024-05-08

- Removed `PRAGMA`s from `migrate()`:
  - `cache_size`: It consumed too much memory.
  - `temp_store`: We don’t use temporary tables and indices, and the default of using files seems acceptable—again, we’re trying to control memory use.

## 1.1.2 · 2024-05-02

- Added `backgroundJob()`.

## 1.1.1 · 2024-04-30

- Added automatic resource management.

## 1.1.0 · 2024-04-29

- Introduced better defaults that avoid the `SQLITE_BUSY` error.

## 1.0.0 · 2024-01-30

- Initial release, based on [`@leafac/sqlite`](https://www.npmjs.com/package/@leafac/sqlite), including the following breaking changes:
  - `migrate()` now sets `journal_mode` to WAL.
  - Added a type parameter to `pragma<Type>()`.
  - Removed the `safeIntegers` option, which would apply at the level of statements. If necessary, set it at the database level with [`database.defaultSafeIntegers()`](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/integer.md#getting-bigints-from-the-database), or get a hold of a particular statement with `database.getStatement()`.
