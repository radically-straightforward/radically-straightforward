# Radically Straightforward · SQLite

**🗃️ SQLite with tagged templates and migrations**

## Installation

```console
$ npm install @radically-straightforward/sqlite
```

> **Note:** We recommend the **[es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** Visual Studio Code extension to syntax highlight SQL in tagged templates.

> **Note:** We recommend **[DBeaver](https://dbeaver.io/)** to interact with the database, including visualizing the current schema (including an automatically generated entity–relationship diagram), testing queries, and so forth.

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

3. Better defaults for running SQLite on the server, avoiding the `SQLITE_BUSY` error.

4. Automatic resource management (close the database before process exit).

5. A background job mechanism.

To appreciate the difference in ergonomics between `better-sqlite3` and `@radically-straightforward/sqlite`, consider the following example:

**`better-sqlite3`**

```typescript
import Database from "better-sqlite3";

const database = new Database("example.db");

database.exec(
  `
    CREATE TABLE "users" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT
    ) STRICT;
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

database.close();
```

1. You must manage the prepared statements yourself, making sure to reuse them as much as possible. You could choose to not do that and create a new prepared statement every time instead, but that would be much slower.

2. The queries and their corresponding binding parameters are specified separately. In this simple example they’re just one line apart, but in general they could be far from each other, which makes the program more difficult to maintain.

3. When you run the program above for the second time, it fails because the `users` table already exists. In this simple example you could work around that by using `CREATE TABLE IF NOT EXISTS`, but for anything more complicated you need a migration system.

4. You must remember to call `close()` or some temporary files may be left behind even after a graceful termination.

**`@radically-straightforward/sqlite`**

```typescript
import sql, { Database } from "@radically-straightforward/sqlite";

const database = await new Database("example.db").migrate(
  sql`
    CREATE TABLE "users" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT
    ) STRICT;
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

   > **Note:** In Visual Studio Code you may install the **[es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** extension to add syntax highlighting to `` sql`___` `` tagged templates.

3. You may run the program above many times and it will not fail, because it’s using `@radically-straightforward/sqlite`’s migration system.

4. If you don’t call `close()` explicitly, it’s called for you before process exit.

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
     ) STRICT;
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

   > **Note:** For convenience, a migration function may receive the database as a parameter. This can be useful if you want to define migrations in separate files.

**Guidelines**

1. As your application evolves, append migrations to the call to `migrate()` but don’t edit or remove existing migrations. Think of the call to `migrate()` as an immutable record of the history of your database schema.

2. Run `migrate()` as your application starts, so that the database schema is always up-to-date.

3. Don’t call `migrate()` multiple times in your application.

4. The migration system guarantees that each migration will run successfully at most once. A migration is run in a database transaction, and if it fails (for example, if it throws an exception), then the transaction is rolled back.

   > **Note:** A migration that fails in the middle may still have had side-effects up to the point of failure (for example, having had written a file to the filesystem), and that could cause issues. Make migrations as free of side-effects as possible.

5. The migration system doesn’t include a way to roll back a migration that has already run successfully. Instead, when necessary, you must create a new migration that undoes the work of the problematic migration.

   > **Why?** This makes managing migrations more straightforward, and in any non-trivial case rollback is impossible anyway (for example, if a migration involves dropping a table, then rolling it back would involve bringing back data that has been deleted).

6. You may consult the status of your database schema with the [`PRAGMA user_version`](https://www.sqlite.org/pragma.html#pragma_user_version), which holds the number of migrations that have been run successfully.

7. The migration system sets several `PRAGMA`s that make SQLite better suited for running on the server, avoiding the `SQLITE_BUSY` error. See <https://kerkour.com/sqlite-for-servers>.

**Implementation Notes**

- `migrate()` must be its own separate method instead of being part of the constructor because migrations may be asynchronous.

- We manage transactions by hand with `BEGIN IMMEDIATE` instead of using `executeTransaction()` because migrations are [the one exception](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/api.md#caveats) in which it makes sense to have an asynchronous function in the middle of a transaction, given that migrations don’t run in parallel.

#### `Database.execute()`

```typescript
execute(query: Query): this;
```

Execute DDL statements, for example, `CREATE TABLE`, `DROP INDEX`, and so forth. Multiple statements may be included in the same query.

#### `Database.run()`

```typescript
run(query: Query): BetterSQLite3Database.RunResult;
```

Run a DML statement, for example, `INSERT`, `UPDATE`, `DELETE`, and so forth.

#### `Database.get()`

```typescript
get<Type>(query: Query): Type | undefined;
```

Run a `SELECT` statement that returns a single result.

> **Note:** If the `SELECT` statement returns multiple results, only the first result is returned, so it’s better to write statements that return a single result (for example, using `LIMIT`).

> **Note:** You may also use `get()` to run an [`INSERT ___ RETURNING ___` statement](https://www.sqlite.org/lang_returning.html), but you probably shouldn’t use `RETURNING`, because it runs into issues in edge cases. Instead, you should use `run()`, get the `lastInsertRowid`, and perform a follow-up `SELECT`. See <https://github.com/WiseLibs/better-sqlite3/issues/654> and <https://github.com/WiseLibs/better-sqlite3/issues/657>.

> **Note:** The `Type` parameter is [an assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions). If you’d like to make sure that the values returned from the database are of a certain type, you must implement a runtime check instead. See <https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794>, <https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/62205>, and <https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65035>. Note that the `get() as ___` pattern also works because by default `Type` is `unknown`.

#### `Database.all()`

```typescript
all<Type>(query: Query): Type[];
```

Run a `SELECT` statement that returns multiple results as an Array.

> **Note:** We recommend including an explicit `ORDER BY` clause to specify the order of the results.

> **Note:** If the results are big and you don’t want to load them all at once, then use `iterate()` instead.

#### `Database.iterate()`

```typescript
iterate<Type>(query: Query): IterableIterator<Type>;
```

Run a `SELECT` statement that returns multiple results as an iterator.

> **Note:** If the results are small and you may load them all at once, then use `all()` instead.

#### `Database.pragma()`

```typescript
pragma<Type>(
    source: string,
    options?: BetterSQLite3Database.PragmaOptions,
  ): Type;
```

Run a `PRAGMA`. Similar to `better-sqlite3`’s `pragma()`, but includes the `Type` assertion similar to other methods.

#### `Database.executeTransaction()`

```typescript
executeTransaction<Type>(fn: () => Type): Type;
```

Execute a function in a transaction. All the [caveats](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/api.md#caveats) about `better-sqlite3`’s transactions still apply. Transactions are `IMMEDIATE` to avoid `SQLITE_BUSY` errors. See <https://kerkour.com/sqlite-for-servers>.

#### `Database.backgroundJob()`

```typescript
backgroundJob<Type>(
    {
      type,
      timeout = 5 * 60 * 1000,
      retryIn = 5 * 60 * 1000,
      retries = 10,
    }: {
      type: string;
      timeout?: number;
      retryIn?: number;
      retries?: number;
    },
    job: (parameters: Type) => void | Promise<void>,
  ): ReturnType<typeof node.backgroundJob>;
```

A background job system that builds upon [`@radically-straightforward/node`](https://github.com/radically-straightforward/radically-straightforward/tree/main/node)’s `backgroundJob()` to provide the following features:

- Persist background jobs in the database so that they are preserved to run later even if the process crashes.

- Allow jobs to be worked on by multiple Node.js processes.

- Impose a timeout on jobs.

- Retry jobs that failed.

- Schedule jobs to run in the future.

- Log the progress of a job throughout the system.

> **Note:** You may use the same database for application data and background jobs, which is simpler to manage, or separate databases for application data for background jobs, which may be faster because background jobs write to the database often and SQLite locks the database on writes.

You may schedule a background job by `INSERT`ing it into the `_backgroundJobs` table that’s created by `migrate()`, for example:

```typescript
database.run(
  sql`
    INSERT INTO "_backgroundJobs" (
      "type",
      "startAt",
      "parameters"
    )
    VALUES (
      ${"email"},
      ${new Date(Date.now() + 5 * 60 * 1000).toISOString()},
      ${JSON.stringify({
        from: "example@example.com",
        to: "radically-straightforward@leafac.com",
        text: "This was sent from a background job.",
      })}
    )
  `
);
```

> **Note:** A job that times out may actually end up running to completion, despite being marked for retrying in the future. This is a consequence of using [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `timeout()`.

> **Note:** A job may be found in the database with a starting date that is too old. This may happen because a process crashed while working on the job without the opportunity to clean things up. This job is logged as `EXTERNAL TIMEOUT` and scheduled for retry.

**References**

- https://github.com/collectiveidea/delayed_job
- https://github.com/betterment/delayed
- https://github.com/bensheldon/good_job
- https://github.com/litements/litequeue
- https://github.com/diamondio/better-queue-sqlite

#### `Database.getStatement()`

```typescript
getStatement(query: Query): BetterSQLite3Database.Statement;
```

An internal method that returns a `better-sqlite3` prepared statement for a given query. Normally you don’t have to use this, but it’s available for advanced use-cases in which you’d like to manipulate a prepared statement (for example, to set [`safeIntegers()`](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/integer.md#getting-bigints-from-the-database)).

### `Query`

```typescript
export type Query = {
  sourceParts: string[];
  parameters: any[];
};
```

An auxiliary type that represents a database query. This is what’s generated by the `` sql`___` `` tagged template.

### `sql()`

```typescript
export default function sql(
  templateStrings: TemplateStringsArray,
  ...substitutions: any[]
): Query;
```

A tagged template to generate a database query.

Interpolation is turned into binding parameters to protect from SQL injection, for example:

```javascript
sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`;
```

Arrays and Sets may be interpolated for `IN` clauses, for example:

```javascript
sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[
  "Leandro Facchinetti",
  "David Adler",
]}`;
```

You may use the pattern `$${___}` (note the two `$`) to interpolate a clause within a query, for example:

```javascript
sql`SELECT "id", "name" FROM "users" WHERE "name" = ${"Leandro Facchinetti"}$${sql` AND "age" = ${33}`}`;
```

> **Note:** This is useful, for example, to build queries for advanced search forms by conditionally including clauses for fields that have been filled in.

<!-- DOCUMENTATION END: ./source/index.mts -->
