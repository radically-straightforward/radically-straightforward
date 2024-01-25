# Changelog

## Unreleased

- Initial release, based on [`@leafac/sqlite`](https://www.npmjs.com/package/@leafac/sqlite). Breaking changes:
  - Removed the `safeIntegers` option, which would apply at the level of statements. If necessary, set it at the database level with [`database.defaultSafeIntegers()`](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/integer.md#getting-bigints-from-the-database), or get a hold of a particular statement with `database.getStatement()`.
  - Added a type parameter to `.pragma<T>()`.

---

- Type parameters are actually coercions:
  - <https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794>
  - <https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/62205>
  - <https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65035>
  - The `.get() as ___` also works.
