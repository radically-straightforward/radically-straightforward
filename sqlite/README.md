<!--
- Style
  - Use `"` around table and column names
  - Use `RETURNING *`
  - Use `ORDER BY` if using `all()`
  - Don’t put `` sql`___` `` on the same line as anything else (because of Visual Studio Code extension)
  - Include `"id" INTEGER PRIMARY KEY AUTOINCREMENT,` in every table


  - Use SQLite as queue:
    - https://github.com/collectiveidea/delayed_job/tree/11e0212fb112c5e11e4555ef1e24510819a66347#gory-details
    - https://sqlite.org/forum/info/b047f5ef5b76edff
    - https://github.com/StratoKit/strato-db/blob/master/src/EventQueue.js
    - https://github.com/litements/litequeue
    - https://www.npmjs.com/package/better-queue-sqlite
    - https://github.com/bensheldon/good_job
    - https://github.com/betterment/delayed



Recommendations
  1. database.pragma("journal_mode = WAL");

  2. (Particularly important if you’re using the above, because otherwise the journal files aren’t resolved)

    process.once("exit", () => {
      database.close();
    });
    process.once("SIGHUP", () => {
      process.exit(128 + 1);
    });
    process.once("SIGINT", () => {
      process.exit(128 + 2);
    });
    process.once("SIGQUIT", () => {
      process.exit(128 + 3);
    });
    process.once("SIGUSR2", () => {
      process.exit(128 + 12);
    });
    process.once("SIGTERM", () => {
      process.exit(128 + 15);
    });
    process.once("SIGBREAK", () => {
      process.exit(128 + 21);
    });


- [ ] Return a dump of the final schema
    - [ ] https://github.com/leafac/sqlite-migration/issues/1
    - [ ] https://github.com/trevyn/turbosql/blob/2e46e42a78f929cb2492a87e7124ba49d01178ca/turbosql-impl/src/lib.rs#L281
- [ ] One more reason why forward only migrations make sense: alter table is limited in sqlite3
I think the documentation should be more like a fork of the documentation of better-sqlite3 otherwise it’s a prerequisite to read the better-sqlite3 docs and understand what you’re wrapper does. I think the current docs should be more of a footnote. Otherwise I wouldn’t see people taking it seriously as they are quickly trying to evaluate a library and browse the API.

Also the migration stuff is awesome but it should be more transparent how it works. ie the “pragma how it works” section should be inline with the migration docs IMO. Also a few examples of how to check the current migration scheme version would be helpful.

Document the IN operator and how it may blow up the cache (https://github.com/leafac/sqlite/pull/2)

Migrations:
- https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes (visited 2022-06-17)
- The library covers the following steps:
  1: If foreign key constraints are enabled, disable them using PRAGMA foreign_keys=OFF.
  2: Start a transaction.
  10: If foreign key constraints were originally enabled then run PRAGMA foreign_key_check to verify that the schema change did not break any foreign key constraints.
  11: Commit the transaction started in step 2.
  12: If foreign keys constraints were originally enabled, reenable them now.
- You must cover the following steps:
  3: Remember the format of all indexes, triggers, and views associated with table X. This information will be needed in step 8 below. One way to do this is to run a query like the following: SELECT type, sql FROM sqlite_schema WHERE tbl_name='X'.
  4: Use CREATE TABLE to construct a new table "new_X" that is in the desired revised format of table X. Make sure that the name "new_X" does not collide with any existing table name, of course.
  5: Transfer content from X into new_X using a statement like: INSERT INTO new_X SELECT ... FROM X.
  6: Drop the old table X: DROP TABLE X.
  7: Change the name of new_X to X using: ALTER TABLE new_X RENAME TO X.
  8: Use CREATE INDEX, CREATE TRIGGER, and CREATE VIEW to reconstruct indexes, triggers, and views associated with table X. Perhaps use the old format of the triggers, indexes, and views saved from step 3 above as a guide, making changes as appropriate for the alteration.
  9: If any views refer to table X in a way that is affected by the schema change, then drop those views using DROP VIEW and recreate them with whatever changes are necessary to accommodate the schema change using CREATE VIEW.
- Hints:
  - Indices & Triggers: Must be recreated after the table rename.
  - Views: If they still apply, they may be preserved, but if they need adaptations they may be dropped and recreated.
  - Foreign keys from other tables pointing at the affected table must be preserved (you don’t want to recreate the whole database, right?)
  - FTS virtual tables with the `content` field behave like foreign keys with in this context, so they may be preserved. (Even though in common database use (`INSERT`s, `SELECT`s, and so forth) FTS virtual tables behave like indices.)

One more reasons to not have “down” migrations: The database schema can’t drift apart from the application code!

Change API of `executeTransaction()` to use options passed as arguments instead of multiple different method names.

<h1 align="center">@leafac/sqlite</h1>
<h3 align="center"><a href="https://npm.im/better-sqlite3">better-sqlite3</a> with <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals">tagged templates</a></h3>
<p align="center">
<a href="https://github.com/leafac/sqlite"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/@leafac/sqlite"><img alt="Package" src="https://badge.fury.io/js/%40leafac%2Fsqlite.svg"></a>
<a href="https://github.com/leafac/sqlite/actions"><img src="https://github.com/leafac/sqlite/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

### Videos

[<img src="https://img.youtube.com/vi/3PCpXOPcVlM/0.jpg" width="200" /><br />Demonstration](https://youtu.be/3PCpXOPcVlM)

[<img src="https://img.youtube.com/vi/ORdYNOwpcsY/0.jpg" width="200" /><br />Code Review](https://youtu.be/ORdYNOwpcsY)

### Installation

```console
$ npm install @leafac/sqlite
```

Use @leafac/sqlite with [the es6-string-html Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) for syntax highlighting on the queries in the tagged templates.

### Features, Usage, and Examples

@leafac/sqlite is a [thin wrapper (approximately 100 lines of code)](src/index.ts) around better-sqlite3 which adds the following features:

#### Prepared Statements Management

To use better-sqlite3 you must create prepared statements and then call them with parameters, for example:

```typescript
import BetterSqlite3Database from "better-sqlite3";

const betterSqlite3Database = new BetterSqlite3Database(":memory:");

betterSqlite3Database.exec(
  `CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
);
const statement = betterSqlite3Database.prepare(
  `INSERT INTO "users" ("name") VALUES (?)`
);
console.log(statement.run("Leandro Facchinetti")); // => { changes: 1, lastInsertRowid: 1 }
```

The benefit of this approach is that you may reuse the statements, which leads to better performance.

The problem with this approach is that you must manage statements in your application, and running simple queries becomes a two-step process.

@leafac/sqlite brings back the simplicity of issuing queries directly to the database object without losing the performance benefits of reuseable prepared statements (see [§ How It Works](#how-it-works)).

#### The `sql` Tagged Template

Queries in @leafac/sqlite must be created with the `sql` tagged template; simple untagged strings don’t work. @leafac/sqlite needs the tagged template to manage the prepared statements and to guarantee that the parameters are escaped safely (see [§ How It Works](#how-it-works)).

For example:

```typescript
import { Database, sql } from "@leafac/sqlite";

const database = new Database(":memory:");
database.execute(
  sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
);
console.log(
  database.run(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
  )
); // => { changes: 1, lastInsertRowid: 1 }
console.log(database.get<{ name: string }>(sql`SELECT * from "users"`)); // => { id: 1, name: 'Leandro Facchinetti' }
```

You may interpolate raw SQL with the `$${...}` form, for example:

```typescript
sql`SELECT * FROM "users" WHERE "name" = ${"Leandro Facchinetti"} $${sql` AND "age" = ${30}`}`;
```

#### Convenience Methods for Transactions

In better-sqlite3, transactions follow a preparation/execution two-step process similar to the one followed by statements, as described in [§ Prepared Statements Management](#prepared-statements-management), for example:

```typescript
const transaction = database.transaction(() => {
  // Doesn’t execute immediately
});
// Execute the transaction
transaction();
```

@leafac/sqlite introduces convenience methods to execute a transaction in one step, for example:

```typescript
database.executeTransaction(() => {
  // Executes immediately
});
```

The function passed to the better-sqlite3 `transaction()` method may have parameters, which will correspond to the arguments passed when executing the transaction. The function passed to the @leafac/sqlite `executeTransaction()` method must not have any parameters.

#### Native TypeScript Support

No need for `npm install --save-dev @types/...`.

#### A Lightweight Migration System

For example:

```typescript
// At an early point in the process of developing an application:
database.migrate(
  sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
);

// At a later point a new migration is added:
database.migrate(
  sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,

  (database) => {
    database.run(
      sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
    );
  }
);
```

The `migrate()` method receives as parameters `` sql`...` `` queries and arbitrary functions. Only the parameters that have not been run before are executed to bring the database up to the most recent version, so you should call `migrate()` at your application startup. Migrations are run on a transaction, so if one of them fails everything rolls back (if your arbitrary functions have side-effects you’ll have to manage them yourself).

##### No Down Migrations

Most migration systems provide a way to **undo** migrations; something called **down** migrations. `migrate()` doesn’t provide a down migration mechanism.

I believe that down migrations are more trouble to maintain (they can be a lot of work!) than they’re worth, particularly in small applications. Why? Because down migrations have two main selling points:

1. You may go back and forward with the database schema in development (think of alternating back and forth while working on different feature branches that change the database schema).
2. You may rollback a deployment that goes wrong in production.

But I don’t think these selling points hold up:

1. You may recreate the database from scratch whenever you need in development.
2. You almost never want to run a down migration in production because that would make you lose data.

In case something goes wrong, `migrate()` requires you to write a new migration that undoes the troublesome previous migration. The only way through is forward!

##### Don’t Change Migrations That Already Run

`migrate()` doesn’t run migrations that it ran in the past, so if you change an existing migration, it won’t take effect. `migrate()` has no mechanism to detect and warn about this kind of issue (it can’t, because arbitrary functions don’t lend themselves to this kind of inspection).

### API

The `Database` class is a subclass of the better-sqlite3 database, so all [better-sqlite3 database’s methods](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#class-database) are available in `Database`. If you need to use the traditional two-step workflow of explicitly preparing a statement as mentioned in [§ Prepared Statements Management](#prepared-statements-management), you can do that.

The `Database` class introduces the following new methods:

- `.run(query, options)`, `.get<T>(query, options)`, `.all<T>(query, options)`, and `.iterate<T>(query, options)`: Equivalent to the corresponding methods in [better-sqlite3’s statements](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#runbindparameters---object). The differences are:

  1. These methods must be called on the database instead of on a prepared statement.
  2. These methods work with queries generated with the `sql` tagged template.
  3. **Advanced:** These methods accept an optional `options` parameter which should be an object with the `safeIntegers` field to control [the use of BigInt in the result](https://github.com/JoshuaWise/better-sqlite3/blob/v7.1.4/docs/integer.md). This changes the underlying statement until another query with the same statement sets `safeIntegers` to a different value. For example:

     ```typescript
     console.log(
       database.get<{ name: string }>(sql`SELECT * from "users"`, {
         safeIntegers: true,
       })
     ); // => { id: 1n, name: 'Leandro Facchinetti' }
     console.log(database.get<{ name: string }>(sql`SELECT * from "users"`)); // => { id: 1n, name: 'Leandro Facchinetti' }
     console.log(
       database.get<{ name: string }>(sql`SELECT * from "users"`, {
         safeIntegers: false,
       })
     ); // => { id: 1, name: 'Leandro Facchinetti' }
     ```

- `.execute<T>(query)`: Equivalent to [better-sqlite3’s `exec()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#execstring---this), but adapted to work with the queries generated with the `sql` tagged template.

- `.executeTransaction<T>(fn)`, `.executeTransactionImmediate<T>(fn)`, and `.executeTransactionExclusive<T>(fn)`: Equivalent to [better-sqlite3’s `transaction()`, `.transaction().immediate()`, and `.transaction().exclusive()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#transactionfunction---function), but execute the transaction immediately (see [§ Convenience Methods for Transactions](#convenience-methods-for-transactions)).

### How It Works

#### Prepared Statements Management & The `sql` Tagged Template

The `sql` tag produces a data structure with the source of the query along with the parameters, for example, the following query:

```javascript
sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`;
```

becomes the following data structure:

```json
{
  "source": "INSERT INTO \"users\" (\"name\") VALUES (?)",
  "parameters": ["Leandro Facchinetti"]
}
```

The `Database` keeps a map from query sources to better-sqlite3 prepared statements (a **cache**; a technique called **memoization**). To run a query, `Database` picks up on the data structure produced by the `sql` tag and looks for the query source in the map; if it’s a hit, then `Database` reuses the prepared statement and only binds the new parameters; otherwise `Database` creates the prepared statement, uses it, and stores it for later.

There’s no cache eviction policy in @leafac/sqlite. The prepared statements for every query ever run hang around in memory for as long as the database object is alive (the statements aren’t eligible for garbage collection because they’re in the map). In most cases, that’s fine because there are only a limited number of queries; it’s the parameters that change. If that becomes a problem for you, you may access the cache under the `statements` property and implement your own cache eviction policy.

You may also use the low-level `.getStatement(query: Query, options: Options)` method to get a hold of the underlying prepared statement in the cache (for example, to use [`pluck()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#plucktogglestate---this), [`expand()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#expandtogglestate---this), [`raw()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#rawtogglestate---this), [`columns()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#columns---array-of-objects), and [`bind()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#bindbindparameters---this)—though `bind()` will probably render the prepared statement unusable by @leafac/sqlite).

#### Migration System

`migrate()` uses the [`user_version` SQLite PRAGMA](https://www.sqlite.org/pragma.html#pragma_user_version) to store the number of migrations it ran in the past, and consults this number to avoid re-running migrations.

### Related Projects

- <https://npm.im/@leafac/html>: Use tagged templates as an HTML template engine.

### Prior Art

- <https://npm.im/better-sqlite3>: The basis for @leafac/sqlite. The rest of this document explains how they’re different.
- <https://npm.im/sql-template-strings>: This was the inspiration for using tagged templates in this way. Unfortunately, sql-template-strings is incompatible with better-sqlite3, thus @leafac/sqlite.
- <https://npm.im/html-template-tag>: I love (and stole) the idea of using `$${...}` to mark safe interpolation from html-template-tag.
- <https://npm.im/package/pg-lit>, <https://npm.im/package/slonik>: These packages also feature tagged templates for SQL, but they’re for [PostgreSQL](https://www.postgresql.org/) instead of SQLite.
- <https://npm.im/sqlite>, and <https://npm.im/better-sqlite3-helper>: These packages include lightweight migration systems. `migrate()` is even more lightweight: It doesn’t support **down** migrations and it requires the migrations to be passed as an array, as opposed to, for example, being stored in SQL files. (But you can come up with this array in any way you want, including, for example, reading from a bunch of SQL files.)
- <https://github.com/trevyn/turbosql>: After having published `migrate()` the author of Turbosql [reached out](https://github.com/leafac/sqlite-migration/issues/1) to say that they independently arrived at a similar design, but in the Rust ecosystem instead of Node.js. It’s great to have company!

### Changelog

#### 4.0.0 · 2022-12-02

**Breaking Change**

Use default import instead of named import for `` sql`...` ``.

Before:

```javascript
import { sql, Database } from "@leafac/sqlite";
```

After:

```javascript
import sql, { Database } from "@leafac/sqlite";
```

#### 3.3.1 · 2022-12-02

- Updated `better-sqlite3` to 8.0.1.

#### 3.3.0 · 2022-11-22

- Updated `better-sqlite3` to 8.0.0.

#### 3.2.1

- Added support for JavaScript `Set`s in queries—they behave like arrays.

#### 3.2.0

- Added support for asynchronous migration functions in `migrate()`. Asynchronous migrations can be useful, for example, if need to ask the user for some input to add initial data to new columns in existing tables.

  **Note:** Now `migrate()` itself is asynchronous, remember to `await` on it.

  **Technical Sidenote:** Migration functions run in a transaction, and generally speaking [transactions shouldn’t persist across ticks of the event loop](https://github.com/WiseLibs/better-sqlite3/blob/f52b3b00cf03090619787a20fb263fec553593ff/docs/api.md#transactionfunction---function), but migrations are a special case: They run at most once, and typically at the application startup, while it’s the only transaction.

#### 3.1.0

- Changed `migrate()` to conform to <https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes>.

#### 3.0.0

- Added support for interpolation of parameters into queries passed to `execute()`, for example:

  ```typescript
  database.execute(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
  );
  ```

  This required a change to the `Query` data type, hence the major version bump, but most people don’t need any extra work to upgrade.

#### 2.0.0

- [ESM-only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
- Added support for the `IN` operator (https://github.com/leafac/sqlite/pull/2, thanks @mfbx9da4).
-->

# Radically Straightforward · SQLite

**🗃️ SQLite with tagged templates and migrations**

## Installation

```console
$ npm install @radically-straightforward/sqlite
```

> **Note:** We recommend the **[es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** Visual Studio Code extension to syntax highlight SQL in tagged templates.

## Usage

```typescript
import sql, { Database } from "@radically-straightforward/sqlite";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `Database`

```typescript
export class Database extends BetterSQLite3Database;
```

An extension of [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3)’s `Database` which includes:

1. A simpler way to run queries using tagged templates instead of managing prepared statements by hand.

2. A migration system.

To appreciate the difference in ergonomics between `better-sqlite3` and `@radically-straightforward/sqlite`, consider the following example:

**`better-sqlite3`**

```javascript
import Database from "better-sqlite3";

const database = new Database("example.db");

database.exec(
  `
    CREATE TABLE "users" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT
    );
  `,
);

const insertStatement = database.prepare(
  `INSERT INTO "users" ("name") VALUES (?)`,
);
insertStatement.run("Leandro Facchinetti");

const selectStatement = database.prepare(
  `SELECT "id", "name" FROM "users" WHERE "name" = ?`,
);
console.log(selectStatement.get("Leandro Facchinetti")); // => { id: 1, name: 'Leandro Facchinetti' }
```

1. You must manage the prepared statements yourself, making sure to reuse them as much as possible. You could choose to not do that and create a new prepared statement every time instead, but that would be much slower.

2. The queries and their corresponding binding parameters are specified separately. In this simple example they’re just one line apart, but in general they could be far from each other, which makes the program more difficult to maintain.

3. When you run the program above for the second time, it fails because the `users` table already exists. In this simple example you could work around that by using `CREATE TABLE IF NOT EXISTS`, but for anything more complicated you need a migration system.

**`@radically-straightforward/sqlite`**

```javascript
import sql, { Database } from "@radically-straightforward/sqlite";

const database = new Database("example.db");

await database.migrate(
  sql`
    CREATE TABLE "users" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT
    );
  `,
);

database.run(
  sql`
    INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})
  `,
);

console.log(
  database.get(
    sql`
      SELECT "id", "name" FROM "users" WHERE "name" = ${"Leandro Facchinetti"}
    `,
  ),
); // => { id: 1, name: 'Leandro Facchinetti' }
```

1. `@radically-straightforward/sqlite` manages the prepared statements for you, and makes sure to reuse them as much as possible.

2. The queries and their corresponding binding parameters are specified together, using interpolation in the `` sql`___` `` tagged template.

   > **Note:** `@radically-straightforward/sqlite` does **not** do simple string interpolation, which would lead to SQL injection vulnerabilities. Under the hood `@radically-straightforward/sqlite` uses bind parameters similar to the `better-sqlite3` example.

   > **Note:** The `` sql`___` `` tagged template makes the **[es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** Visual Studio Code extension syntax highlight SQL in tagged templates.

3. You may run the program above many times and it will not fail, because it’s using `@radically-straightforward/sqlite`’s migration system.

#### `Database.migrate()`

```typescript
async migrate(
    ...migrations: (Query | ((database: this) => void | Promise<void>))[]
  ): Promise<this>;
```

A migration system based on [the steps for general schema changes in SQLite](https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes). The migration system implements steps 1–2, 10–12, and you must implement steps 3–9 in the migrations that you define.

A migration may be:

1. A SQL query, for example:

   ```javascript
   sql`
     CREATE TABLE "users" (
       "id" INTEGER PRIMARY KEY AUTOINCREMENT,
       "name" TEXT
     );
   `;
   ```

2. A function, which may be asynchronous:

   ```javascript
   async () => {
     database.execute(
       sql`
         INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"});
       `,
     );
   };
   ```

   > **Note:** For convenience, a migration function receives the database as a parameter. This can be useful if you want to define migrations in separate files.

**Guidelines**

1. As your application evolves, append migrations to the call to `migrate()` but don’t edit or remove existing migrations. Think of the call to `migrate()` as an immutable record of the history of your database schema.

2. Run `migrate()` as your application starts, so that the database schema is always up-to-date.

3. Don’t call `migrate()` multiple times in your application.

4. The migration system guarantees that each migration will run successfully at most once. A migration is run in a transaction, and if it fails (for example, if it throws an exception), then the transaction is rolled back.

   > **Note:** A migration that fails to run in the middle may still have had side-effects up to the point of failure, for example, having written a file to the filesystem, and that could cause issues. Make migrations as free of side-effects as possible.

5. The migration system doesn’t include a way to roll back a migration that has already run successfully. Instead, when necessary, you must create a new migration that undoes the work of the problematic migration.

   > **Why?** This makes managing migrations more obviously correct, and in any non-trivial case rollback is impossible anyway, for example, if a migration involves dropping a table, then rolling it back would involve bringing back data that has been deleted.

6. The migration system sets the `journal_mode` to WAL. See <https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/performance.md> and <https://www.sqlite.org/wal.html>.

7. You may consult the status of your database schema with the pragma `user_version`, which holds the number of migrations that have been run successfully.

<!-- DOCUMENTATION END: ./source/index.mts -->
