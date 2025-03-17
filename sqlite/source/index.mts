import timers from "node:timers/promises";
import BetterSQLite3Database from "better-sqlite3";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";

/**
 * An extension of [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3)’s `Database` which includes:
 *
 * 1. A simpler way to run queries using tagged templates instead of managing prepared statements by hand.
 *
 * 2. A migration system.
 *
 * 3. Better defaults for running SQLite on the server, avoiding the `SQLITE_BUSY` error.
 *
 * 4. Automatic resource management (close the database before process exit).
 *
 * 5. A background job mechanism.
 *
 * 6. A caching mechanism.
 *
 * To appreciate the difference in ergonomics between `better-sqlite3` and `@radically-straightforward/sqlite`, consider the following example:
 *
 * **`better-sqlite3`**
 *
 * ```typescript
 * import Database from "better-sqlite3";
 *
 * const database = new Database("example.db");
 *
 * database.exec(
 *   `
 *     create table "users" (
 *       "id" integer primary key autoincrement,
 *       "name" text not null
 *     ) strict;
 *   `,
 * );
 *
 * const insertStatement = database.prepare(
 *   `insert into "users" ("name") values (?);`,
 * );
 * insertStatement.run("Leandro Facchinetti");
 *
 * const selectStatement = database.prepare(
 *   `select "id", "name" from "users" where "name" = ?;`,
 * );
 * console.log(selectStatement.get("Leandro Facchinetti")); // => { id: 1, name: 'Leandro Facchinetti' }
 *
 * database.close();
 * ```
 *
 * 1. You must manage the prepared statements yourself, making sure to reuse them as much as possible. You could choose to not do that and create a new prepared statement every time instead, but that would be much slower.
 *
 * 2. The queries and their corresponding binding parameters are specified separately. In this simple example they’re just one line apart, but in general they could be far from each other, which makes the program more difficult to maintain.
 *
 * 3. When you run the program above for the second time, it fails because the `users` table already exists. In this simple example you could work around that by using `create table if not exists`, but for anything more complicated you need a migration system.
 *
 * 4. You must remember to call `close()` or some temporary files may be left behind even after a graceful termination.
 *
 * **`@radically-straightforward/sqlite`**
 *
 * ```typescript
 * import sql, { Database } from "@radically-straightforward/sqlite";
 *
 * const database = await new Database("example.db").migrate(
 *   sql`
 *     create table "users" (
 *       "id" integer primary key autoincrement,
 *       "name" text not null
 *     ) strict;
 *   `,
 * );
 *
 * database.run(
 *   sql`
 *     insert into "users" ("name") values (${"Leandro Facchinetti"});
 *   `,
 * );
 *
 * console.log(
 *   database.get(
 *     sql`
 *       select "id", "name" from "users" where "name" = ${"Leandro Facchinetti"};
 *     `,
 *   ),
 * ); // => { id: 1, name: 'Leandro Facchinetti' }
 * ```
 *
 * 1. `@radically-straightforward/sqlite` manages the prepared statements for you, and makes sure to reuse them as much as possible.
 *
 * 2. The queries and their corresponding binding parameters are specified together, using interpolation in the `` sql`___` `` tagged template.
 *
 *    > **Note:** `@radically-straightforward/sqlite` does **not** do simple string interpolation, which would lead to SQL injection vulnerabilities. Under the hood `@radically-straightforward/sqlite` uses bind parameters similar to the `better-sqlite3` example.
 *
 *    > **Note:** In Visual Studio Code you may install the **[ES6 String HTML](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** extension to add syntax highlighting to `` sql`___` `` tagged templates.
 *
 * 3. You may run the program above many times and it will not fail, because it’s using `@radically-straightforward/sqlite`’s migration system.
 *
 * 4. If you don’t call `close()` explicitly, it’s called for you before process exit.
 */
export class Database extends BetterSQLite3Database {
  #beforeExitEventListener = () => {
    this.close();
  };

  constructor(
    filename?: string | Buffer,
    options?: BetterSQLite3Database.Options,
  ) {
    super(filename, options);
    process.once("beforeExit", this.#beforeExitEventListener);
  }

  /**
   * A migration system based on [the steps for general schema changes in SQLite](https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes). The migration system implements steps 1–2, 11–12, and you must implement steps 3–10 in the migrations that you define.
   *
   * A migration may be:
   *
   * 1. A SQL query, for example:
   *
   *    ```javascript
   *    sql`
   *      create table "users" (
   *        "id" integer primary key autoincrement,
   *        "name" text not null
   *      ) strict;
   *    `;
   *    ```
   *
   * 2. A function, which may be asynchronous:
   *
   *    ```javascript
   *    async () => {
   *      database.execute(
   *        sql`
   *          insert into "users" ("name") values (${"Leandro Facchinetti"});
   *        `,
   *      );
   *    };
   *    ```
   *
   *    > **Note:** For convenience, a migration function may receive the database as a parameter. This can be useful if you want to define migrations in separate files.
   *
   * **Guidelines**
   *
   * 1. As your application evolves, append migrations to the call to `migrate()` but don’t edit or remove existing migrations. Think of the call to `migrate()` as an immutable record of the history of your database schema.
   *
   * 2. Run `migrate()` as your application starts, so that the database schema is always up-to-date.
   *
   * 3. Don’t call `migrate()` multiple times in your application.
   *
   * 4. The migration system guarantees that each migration will run successfully at most once. A migration is run in a database transaction, and if it fails (for example, if it throws an exception), then the transaction is rolled back.
   *
   *    > **Note:** A migration that fails in the middle may still have had side-effects up to the point of failure (for example, having had written a file to the filesystem), and that could cause issues. Make migrations as free of side-effects as possible.
   *
   * 5. The migration system doesn’t include a way to roll back a migration that has already run successfully. Instead, when necessary, you must create a new migration that undoes the work of the problematic migration.
   *
   *    > **Why?** This makes managing migrations more straightforward, and in any non-trivial case rollback is impossible anyway (for example, if a migration involves dropping a table, then rolling it back would involve bringing back data that has been deleted).
   *
   * 6. You may consult the status of your database schema with the [`pragma user_version`](https://www.sqlite.org/pragma.html#pragma_user_version), which holds the number of migrations that have been run successfully.
   *
   * 7. The migration system sets several `pragma`s that make SQLite better suited for running on the server, avoiding the `SQLITE_BUSY` error. See <https://kerkour.com/sqlite-for-servers>.
   *
   * **Implementation Notes**
   *
   * - `migrate()` must be its own separate method instead of being part of the constructor because migrations may be asynchronous.
   *
   * - We manage transactions by hand with `begin immediate` instead of using `executeTransaction()` because migrations are [the one exception](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/api.md#caveats) in which it makes sense to have an asynchronous function in the middle of a transaction, given that migrations don’t run in parallel.
   */
  async migrate(
    ...migrations: (Query | ((database: this) => void | Promise<void>))[]
  ): Promise<this> {
    this.pragma<void>(`journal_mode = wal`);
    this.pragma<void>(`synchronous = normal`);
    this.pragma<void>(`busy_timeout = 5000`);
    this.pragma<void>(`foreign_keys = false`);
    try {
      this.executeTransaction(() => {
        this.execute(
          sql`
            create table if not exists "_backgroundJobs" (
              "id" integer primary key autoincrement,
              "type" text not null,
              "startAt" text not null,
              "parameters" text not null,
              "startedAt" text null,
              "retries" integer null
            ) strict;
            drop index if exists "_backgroundJobsType";
            drop index if exists "_backgroundJobsStartAt";
            drop index if exists "_backgroundJobsStartedAt";
            drop index if exists "_backgroundJobsRetries";
            create index if not exists "_index_backgroundJobs_type" on "_backgroundJobs" ("type");
            create index if not exists "_index_backgroundJobs_startAt" on "_backgroundJobs" ("startAt");
            create index if not exists "_index_backgroundJobs_startedAt" on "_backgroundJobs" ("startedAt");
            create index if not exists "_index_backgroundJobs_retries" on "_backgroundJobs" ("retries");

            create table if not exists "_cache" (
              "id" integer primary key autoincrement,
              "key" text not null,
              "value" text not null,
              "usedAt" text not null
            ) strict;
            create index if not exists "_index_cache_key" on "_cache" ("key");
            create index if not exists "_index_cache_usedAt" on "_cache" ("usedAt");
          `,
        );
      });
      for (
        let migrationIndex = this.pragma<number>(`user_version`, {
          simple: true,
        });
        migrationIndex < migrations.length;
        migrationIndex++
      )
        try {
          this.execute(
            sql`
              begin immediate;
            `,
          );
          const migration = migrations[migrationIndex];
          if (typeof migration === "function") await migration(this);
          else this.execute(migration);
          this.pragma<void>(`user_version = ${migrationIndex + 1}`);
          this.execute(
            sql`
              commit;
            `,
          );
        } catch (error) {
          this.execute(
            sql`
              rollback;
            `,
          );
          throw error;
        }
    } finally {
      this.pragma<void>(`foreign_keys = true`);
    }
    return this;
  }

  /**
   * Execute DDL statements, for example, `create table`, `drop index`, and so forth. Multiple statements may be included in the same query.
   */
  execute(query: Query): this {
    let source = "";
    for (
      let parametersIndex = 0;
      parametersIndex < query.parameters.length;
      parametersIndex++
    )
      source +=
        query.sourceParts[parametersIndex] +
        this.get<{ parameter: string }>(
          sql`
            select quote(${query.parameters[parametersIndex]}) as "parameter";
          `,
        )!.parameter;
    source += query.sourceParts.at(-1);
    return this.exec(source);
  }

  /**
   * Run a DML statement, for example, `insert`, `update`, `delete`, and so forth.
   */
  run(query: Query): BetterSQLite3Database.RunResult {
    return this.getStatement(query).run(...query.parameters);
  }

  /**
   * Run a `select` statement that returns a single result.
   *
   * > **Note:** If the `select` statement returns multiple results, only the first result is returned, so it’s better to write statements that return a single result (for example, using `limit`).
   *
   * > **Note:** You may also use `get()` to run an [`insert ___ returning ___` statement](https://www.sqlite.org/lang_returning.html), but you probably shouldn’t use `returning`, because it runs into issues in edge cases. Instead, you should use `run()`, get the `lastInsertRowid`, and perform a follow-up `select`. See <https://github.com/WiseLibs/better-sqlite3/issues/654> and <https://github.com/WiseLibs/better-sqlite3/issues/657>.
   *
   * > **Note:** The `Type` parameter is [an assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions). If you’d like to make sure that the values returned from the database are of a certain type, you must implement a runtime check instead. See <https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794>, <https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/62205>, and <https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65035>. Note that the `get() as ___` pattern also works because by default `Type` is `unknown`.
   */
  get<Type>(query: Query): Type | undefined {
    return this.getStatement(query).get(...query.parameters) as
      | Type
      | undefined;
  }

  /**
   * Run a `select` statement that returns multiple results as an Array.
   *
   * > **Note:** We recommend including an explicit `order by` clause to specify the order of the results.
   *
   * > **Note:** If the results are big and you don’t want to load them all at once, then use `iterate()` instead.
   */
  all<Type>(query: Query): Type[] {
    return this.getStatement(query).all(...query.parameters) as Type[];
  }

  /**
   * Run a `select` statement that returns multiple results as an iterator.
   *
   * > **Note:** If the results are small and you may load them all at once, then use `all()` instead.
   */
  iterate<Type>(query: Query): IterableIterator<Type> {
    return this.getStatement(query).iterate(
      ...query.parameters,
    ) as IterableIterator<Type>;
  }

  /**
   * Run a `pragma`. Similar to `better-sqlite3`’s `pragma()`, but includes the `Type` assertion similar to other methods.
   */
  pragma<Type>(
    source: string,
    options?: BetterSQLite3Database.PragmaOptions,
  ): Type {
    return super.pragma(source, options) as Type;
  }

  /**
   * Execute a function in a transaction. All the [caveats](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/api.md#caveats) about `better-sqlite3`’s transactions still apply. Transactions are `immediate` to avoid `SQLITE_BUSY` errors. See <https://kerkour.com/sqlite-for-servers>.
   */
  executeTransaction<Type>(fn: () => Type): Type {
    return this.transaction(fn).immediate();
  }

  /**
   * A background job system that builds upon [`@radically-straightforward/node`](https://github.com/radically-straightforward/radically-straightforward/tree/main/node)’s `backgroundJob()` to provide the following features:
   *
   * - Persist background jobs in the database so that they are preserved to run later even if the process crashes.
   *
   * - Allow jobs to be worked on by multiple Node.js processes.
   *
   * - Impose a timeout on jobs.
   *
   * - Retry jobs that failed.
   *
   * - Schedule jobs to run in the future.
   *
   * - Log the progress of a job throughout the system.
   *
   * > **Note:** You may use the same database for application data and background jobs, which is simpler to manage, or separate databases for application data for background jobs, which may be faster because background jobs write to the database often and SQLite locks the database on writes.
   *
   * You may schedule a background job by `insert`ing it into the `_backgroundJobs` table that’s created by `migrate()`, for example:
   *
   * ```typescript
   * database.run(
   *   sql`
   *     insert into "_backgroundJobs" (
   *       "type",
   *       "startAt",
   *       "parameters"
   *     )
   *     values (
   *       ${"email"},
   *       ${new Date(Date.now() + 5 * 60 * 1000).toISOString()},
   *       ${JSON.stringify({
   *         from: "example@example.com",
   *         to: "radically-straightforward@leafac.com",
   *         text: "This was sent from a background job.",
   *       })}
   *     );
   *   `,
   * );
   * ```
   *
   * > **Note:** A job that times out may actually end up running to completion, despite being marked for retrying in the future. This is a consequence of using [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `timeout()`.
   *
   * > **Note:** A job may be found in the database with a starting date that is too old. This may happen because a process crashed while working on the job without the opportunity to clean things up. This job is logged as `EXTERNAL TIMEOUT` and scheduled for retry.
   *
   * **References**
   *
   * - https://github.com/collectiveidea/delayed_job
   * - https://github.com/betterment/delayed
   * - https://github.com/bensheldon/good_job
   * - https://github.com/litements/litequeue
   * - https://github.com/diamondio/better-queue-sqlite
   */
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
  ): ReturnType<typeof node.backgroundJob> {
    return node.backgroundJob({ interval: 5000 }, async () => {
      this.executeTransaction(() => {
        for (const backgroundJob of this.all<{
          id: number;
          parameters: string;
          retries: number | null;
        }>(
          sql`
            select "id", "parameters", "retries"
            from "_backgroundJobs"
            where
              "type" = ${type} and
              "startedAt" is not null and
              "startedAt" < ${new Date(Date.now() - timeout).toISOString()};
          `,
        )) {
          utilities.log(
            "DATABASE BACKGROUND JOB",
            "EXTERNAL TIMEOUT",
            type,
            String(backgroundJob.id),
            backgroundJob.retries === null ? backgroundJob.parameters : "",
          );
          this.run(
            sql`
              update "_backgroundJobs"
              set
                "startAt" = ${new Date(Date.now()).toISOString()},
                "startedAt" = null,
                "retries" = ${(backgroundJob.retries ?? 0) + 1}
              where "id" = ${backgroundJob.id};
            `,
          );
        }
      });
      this.executeTransaction(() => {
        for (const backgroundJob of this.all<{
          id: number;
        }>(
          sql`
            select "id"
            from "_backgroundJobs"
            where
              "type" = ${type} and
              "retries" is not null and
              ${retries} <= "retries";
          `,
        )) {
          utilities.log(
            "DATABASE BACKGROUND JOB",
            "FAIL",
            type,
            String(backgroundJob.id),
          );
          this.run(
            sql`
              delete from "_backgroundJobs" where "id" = ${backgroundJob.id};
            `,
          );
        }
      });
      while (true) {
        const backgroundJob = this.executeTransaction<
          | {
              id: number;
              parameters: string;
              retries: number | null;
            }
          | undefined
        >(() => {
          const backgroundJob = this.get<{
            id: number;
            parameters: string;
            retries: number | null;
          }>(
            sql`
              select "id", "parameters", "retries"
              from "_backgroundJobs"
              where
                "type" = ${type} and
                "startAt" <= ${new Date().toISOString()} and
                "startedAt" is null and (
                  "retries" is null or
                  "retries" < ${retries}
                )
              order by "id" asc
              limit 1;
            `,
          );
          if (backgroundJob === undefined) return undefined;
          this.run(
            sql`
              update "_backgroundJobs"
              set "startedAt" = ${new Date().toISOString()}
              where "id" = ${backgroundJob.id};
            `,
          );
          return backgroundJob;
        });
        if (backgroundJob === undefined) break;
        const start = process.hrtime.bigint();
        try {
          utilities.log(
            "DATABASE BACKGROUND JOB",
            "START",
            type,
            String(backgroundJob.id),
          );
          await utilities.timeout(timeout, async () => {
            await job(JSON.parse(backgroundJob.parameters));
          });
          this.run(
            sql`
              delete from "_backgroundJobs" where "id" = ${backgroundJob.id};
            `,
          );
          utilities.log(
            "DATABASE BACKGROUND JOB",
            "SUCCESS",
            type,
            String(backgroundJob.id),
            `${(process.hrtime.bigint() - start) / 1_000_000n}ms`,
          );
        } catch (error) {
          utilities.log(
            "DATABASE BACKGROUND JOB",
            "ERROR",
            type,
            String(backgroundJob.id),
            `${(process.hrtime.bigint() - start) / 1_000_000n}ms`,
            backgroundJob.retries === null ? backgroundJob.parameters : "",
            String(error),
            (error as Error)?.stack ?? "",
          );
          this.run(
            sql`
              update "_backgroundJobs"
              set
                "startAt" = ${new Date(Date.now() + (error === "TIMEOUT" ? 0 : retryIn)).toISOString()},
                "startedAt" = null,
                "retries" = ${(backgroundJob.retries ?? 0) + 1}
              where "id" = ${backgroundJob.id};
            `,
          );
        }
        await timers.setTimeout(200);
      }
    });
  }

  cacheSize = 10_000;
  /**
   * A simple cache mechanism backed by the SQLite database.
   *
   * If the `key` is not found, then the `valueGenerator()` is called and its result is stored. If the `key` is found, then the stored `value` is returned and `valueGenerator()` is not called.
   *
   * The cache holds at most `this.cacheSize` items (by default `10_000`). As new items are added, the least recently used (LRU) items are deleted.
   *
   * The `key` must contain all the information that identifies the `value`, for example, `` `messages/${message.id}/updatedAt/${message.updatedAt}` ``. As the `message` is updated, old cache entries aren’t expired explicitly, but fall out of the cache as new items are added.
   *
   * This cache is appropriate for storing server-side HTML that’s expensive to compute, memoized values in dynamic programming, and so forth.
   *
   * The advantages of using SQLite instead of something like a `Map` in the JavaScript process itself are that the cache persists across application restarts, and that the cache may be shared across multiple processes of the same application.
   *
   * The advantage of using SQLite instead of something like Redis or Memcached is that it’s less infrastructure to maintain.
   *
   * You may want to have the cache in the same database as the application, because it’s simpler. Or you may prefer to have the cache in a dedicated database, because the cache involves a lot of writes, which could slow down other parts of the application.
   *
   * **References**
   *
   * - <https://guides.rubyonrails.org/caching_with_rails.html#low-level-caching>
   * - <https://signalvnoise.com/posts/3113-how-key-based-cache-expiration-works>
   *
   * **Implementation Notes**
   *
   * We don’t use a transaction between consulting the cache and updating the cache so that things are as fast as possible: a transaction would lock writes to the database for longer—not to mention that `valueGenerator()` may be asynchronous in `cacheAsync()`, and it runs between these two steps. As a consequence, in case of a race condition, the `key` may appear multiple times in the cache. But that isn’t an issue, because the `key` isn’t `unique` in the schema, so no uniqueness constraint violation happens, and if the cache is being used correctly and `valueGenerator()` returns the same value every time, then both `key`s will have the same `value`, and one of them will not be used and naturally fall out of the cache at some point.
   */
  cache(key: string, valueGenerator: () => string): string {
    let value: string;
    const valueRow = this.get<{ id: number; value: string }>(
      sql`
        select "id", "value" from "_cache" where "key" = ${key};
      `,
    );
    if (valueRow === undefined) {
      value = valueGenerator();
      this.run(
        sql`
          insert into "_cache" ("key", "value", "usedAt")
          values (
            ${key},
            ${value},
            ${new Date().toISOString()}
          );
        `,
      );
      this.run(
        sql`
          delete from "_cache"
          order by "usedAt" desc
          limit -1 offset ${this.cacheSize};
        `,
      );
    } else {
      value = valueRow.value;
      this.run(
        sql`
          update "_cache"
          set "usedAt" = ${new Date().toISOString()}
          where "id" = ${valueRow.id};
        `,
      );
    }
    return value;
  }

  /**
   * An asynchronous version of `cache()` for when the `valueGenerator()` is asynchronous.
   */
  async cacheAsync(
    key: string,
    valueGenerator: () => string | Promise<string>,
  ): Promise<string> {
    let value: string;
    const valueRow = this.get<{ id: number; value: string }>(
      sql`
        select "id", "value" from "_cache" where "key" = ${key};
      `,
    );
    if (valueRow === undefined) {
      value = await valueGenerator();
      this.run(
        sql`
          insert into "_cache" ("key", "value", "usedAt")
          values (
            ${key},
            ${value},
            ${new Date().toISOString()}
          );
        `,
      );
      this.run(
        sql`
          delete from "_cache"
          order by "usedAt" desc
          limit -1 offset ${this.cacheSize};
        `,
      );
    } else {
      value = valueRow.value;
      this.run(
        sql`
          update "_cache"
          set "usedAt" = ${new Date().toISOString()}
          where "id" = ${valueRow.id};
        `,
      );
    }
    return value;
  }

  close(): this {
    super.close();
    process.off("beforeExit", this.#beforeExitEventListener);
    return this;
  }

  #statements = new Map<string, BetterSQLite3Database.Statement>();
  /**
   * An internal method that returns a `better-sqlite3` prepared statement for a given query. Normally you don’t have to use this, but it’s available for advanced use-cases in which you’d like to manipulate a prepared statement (for example, to set [`safeIntegers()`](https://github.com/WiseLibs/better-sqlite3/blob/bd55c76c1520c7796aa9d904fe65b3fb4fe7aac0/docs/integer.md#getting-bigints-from-the-database)).
   */
  getStatement(query: Query): BetterSQLite3Database.Statement {
    const source = query.sourceParts.join("?");
    let statement = this.#statements.get(source);
    if (statement === undefined) {
      statement = this.prepare(source);
      this.#statements.set(source, statement);
    }
    return statement;
  }
}

/**
 * An auxiliary type that represents a database query. This is what’s generated by the `` sql`___` `` tagged template.
 */
export type Query = {
  sourceParts: string[];
  parameters: any[];
};

/**
 * A tagged template to generate a database query.
 *
 * Interpolation is turned into binding parameters to protect from SQL injection, for example:
 *
 * ```javascript
 * sql`insert into "users" ("name") values (${"Leandro Facchinetti"});`;
 * ```
 *
 * Arrays and Sets may be interpolated for `in` clauses, for example:
 *
 * ```javascript
 * sql`select "id", "name" from "users" where "name" in ${[
 *   "Leandro Facchinetti",
 *   "David Adler",
 * ]};`;
 * ```
 *
 * You may use the pattern `$${___}` (note the two `$`) to interpolate a clause within a query, for example:
 *
 * ```javascript
 * sql`select "id", "name" from "users" where "name" = ${"Leandro Facchinetti"}$${sql` and "age" = ${33}`};`;
 * ```
 *
 * > **Note:** This is useful, for example, to build queries for advanced search forms by conditionally including clauses for fields that have been filled in.
 */
export default function sql(
  templateStrings: TemplateStringsArray,
  ...substitutions: (
    | number
    | string
    | bigint
    | Buffer
    | null
    | undefined
    | Array<number | string | bigint | Buffer | null | undefined>
    | Set<number | string | bigint | Buffer | null | undefined>
    | Query
  )[]
): Query {
  const templateParts = [...templateStrings];
  const query: Query = { sourceParts: [], parameters: [] };
  for (
    let substitutionsIndex = 0;
    substitutionsIndex < substitutions.length;
    substitutionsIndex++
  ) {
    let templatePart = templateParts[substitutionsIndex];
    let substitution = substitutions[substitutionsIndex];
    if (substitution instanceof Set) substitution = [...substitution];
    if (templatePart.endsWith("$")) {
      templatePart = templatePart.slice(0, -1);
      const substitutionQuery = substitution as Query;
      if (substitutionQuery.sourceParts.length === 1)
        templateParts[substitutionsIndex + 1] = `${templatePart}${
          substitutionQuery.sourceParts[0]
        }${templateParts[substitutionsIndex + 1]}`;
      else {
        query.sourceParts.push(
          `${templatePart}${substitutionQuery.sourceParts[0]}`,
          ...substitutionQuery.sourceParts.slice(1, -1),
        );
        templateParts[substitutionsIndex + 1] =
          `${substitutionQuery.sourceParts.at(-1)}${
            templateParts[substitutionsIndex + 1]
          }`;
        query.parameters.push(...substitutionQuery.parameters);
      }
    } else if (Array.isArray(substitution)) {
      if (substitution.length === 0)
        templateParts[substitutionsIndex + 1] = `${templatePart}()${
          templateParts[substitutionsIndex + 1]
        }`;
      else {
        query.sourceParts.push(
          `${templatePart}(`,
          ...new Array(substitution.length - 1).fill(","),
        );
        templateParts[substitutionsIndex + 1] = `)${
          templateParts[substitutionsIndex + 1]
        }`;
        query.parameters.push(...substitution);
      }
    } else {
      query.sourceParts.push(templatePart);
      query.parameters.push(substitution);
    }
  }
  query.sourceParts.push(templateParts.at(-1)!);
  return query;
}
