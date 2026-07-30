import sqlite from "node:sqlite";
import timers from "node:timers/promises";
import { CronExpressionParser } from "cron-parser";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";

/**
 * An extension of `node:sqlite`’s `DatabaseSync` which adds the following features:
 *
 * 1. A way to run queries using tagged templates.
 *
 *    > **Note:** This is different from `SQLTagStore` in the following ways:
 *    >
 *    > 1. It allows nesting query fragments, for example:
 *    >
 *    >    ```typescript
 *    >    sql`
 *    >      select "id", "name"
 *    >      from "users"
 *    >      where
 *    >        "name" = ${"Leandro Facchinetti"}
 *    >        ${shouldFilterByAge ? sql`and "age" = ${35}` : sql``};
 *    >    `;
 *    >    ```
 *    >
 *    > 2. The tags in the tagged templates don’t execute the queries, for example:
 *    >
 *    >    ```typescript
 *    >    // SQLTagStore
 *    >    sql.get`select "name" from "users";`;
 *    >
 *    >    // Database
 *    >    database.get(sql`select "name" from "users";`);
 *    >    ```
 *    >
 *    >    This is better because it works with syntax highlighting with the **[ES6 String HTML](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** extension for Visual Studio Code.
 *    >
 *    > 3. It isn’t a LRU cache. This shouldn’t be a problem because there’s a bounded number of queries in the source code.
 *
 * 2. An auxiliary function for running transactions.
 *
 * 3. A migration system.
 *
 * 4. Better defaults for running SQLite on the server, avoiding the `SQLITE_BUSY` error.
 *
 * 5. Automatic resource management (close the database upon graceful termination).
 *
 * 6. A background job mechanism.
 *
 * 7. A scheduled background job mechanism.
 *
 * 8. A caching mechanism.
 */
export class Database extends sqlite.DatabaseSync {
  #beforeExitEventListener = () => {
    this.close();
  };

  constructor(filename: string | Buffer | URL) {
    super(filename);
    process.once("beforeExit", this.#beforeExitEventListener);
  }

  close(): void {
    super.close();
    process.off("beforeExit", this.#beforeExitEventListener);
  }

  /**
   * A migration system based on [the steps for general schema changes in SQLite](https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes). The migration system implements steps 1–2, 11–12, and you must implement steps 3–10 in the migrations that you define.
   *
   * A migration may be:
   *
   * 1. A query, for example:
   *
   *    ```typescript
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
   *    ```typescript
   *    async (database) => {
   *      database.run(
   *        sql`
   *          insert into "users" ("name") values (${"Leandro Facchinetti"});
   *        `,
   *      );
   *    };
   *    ```
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
   */
  async migrate(
    ...migrations: (Query | ((database: this) => void | Promise<void>))[]
  ): Promise<this> {
    try {
      this.execute(
        sql`
          pragma journal_mode = wal;
          pragma synchronous = normal;
          pragma busy_timeout = 5000;
          pragma cache_size = -16000;
          pragma foreign_keys = false;

          create table if not exists "_backgroundJobs" (
            "id" integer primary key autoincrement,
            "type" text not null,
            "startAt" text not null,
            "parameters" text not null,
            "startedAt" text null,
            "retries" integer null
          ) strict;
          create index if not exists "_index_backgroundJobs_type" on "_backgroundJobs" ("type");
          create index if not exists "_index_backgroundJobs_startAt" on "_backgroundJobs" ("startAt");
          create index if not exists "_index_backgroundJobs_startedAt" on "_backgroundJobs" ("startedAt");
          create index if not exists "_index_backgroundJobs_retries" on "_backgroundJobs" ("retries");

          create table if not exists "_scheduledBackgroundJobs" (
            "id" integer primary key autoincrement,
            "type" text not null unique,
            "lastScheduledAt" text not null
          ) strict;

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
      for (
        let migrationIndex = this.get<{ user_version: number }>(
          sql`
            pragma user_version;
          `,
        )!.user_version;
        migrationIndex < migrations.length;
        migrationIndex++
      )
        await this.transactionAsync(async () => {
          const migration = migrations[migrationIndex];
          if (typeof migration === "function") await migration(this);
          else this.execute(migration);
          this.exec(
            `
              pragma user_version = ${migrationIndex + 1};
            `,
          );
        });
      return this;
    } finally {
      this.execute(
        sql`
          pragma foreign_keys = true;
        `,
      );
    }
  }

  /**
   * Execute DDL statements, for example, `create table`, `drop index`, and so forth. Multiple statements may be included in the same query. The query must not include interpolation.
   */
  execute(query: Query): void {
    if (0 < query.parameters.length)
      throw new Error(
        "‘execute()’ can’t be called with a query including interpolation",
      );
    this.exec(query.source);
  }

  /**
   * Run a DML statement, for example, `insert`, `update`, `delete`, and so forth.
   */
  run(query: Query): sqlite.StatementResultingChanges {
    return this.#getStatement(query.source).run(...query.parameters);
  }

  /**
   * Run a `select` statement that returns a single result.
   *
   * > **Note:** If the `select` statement returns multiple results, only the first result is returned, so it’s better to write statements that return a single result (for example, using `limit`).
   *
   * > **Note:** The `Type` parameter is [an assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions). If you’d like to ensure that the values returned from the database are of a certain type, you must implement a runtime check instead.
   */
  get<Type>(query: Query): Type | undefined {
    return this.#getStatement(query.source).get(...query.parameters) as
      Type | undefined;
  }

  /**
   * Run a `select` statement that returns multiple results as an Array.
   *
   * > **Note:** We recommend including an explicit `order by` clause to specify the order of the results.
   *
   * > **Note:** If the results are big and you don’t want to load them all at once, then use `iterate()` instead.
   */
  all<Type>(query: Query): Type[] {
    return this.#getStatement(query.source).all(...query.parameters) as Type[];
  }

  /**
   * Run a `select` statement that returns multiple results as an iterator.
   *
   * > **Note:** If the results are small and you may load them all at once, then use `all()` instead.
   */
  iterate<Type>(query: Query): NodeJS.Iterator<Type> {
    return this.#getStatement(query.source).iterate(
      ...query.parameters,
    ) as NodeJS.Iterator<Type>;
  }

  /**
   * Execute a function in a transaction. The transaction is `immediate` to avoid `SQLITE_BUSY` errors. See <https://kerkour.com/sqlite-for-servers>.
   */
  transaction<Type>(function_: () => Type): Type {
    this.execute(
      sql`
        begin immediate;
      `,
    );
    try {
      const value = function_();
      this.execute(
        sql`
          commit;
        `,
      );
      return value;
    } catch (error) {
      this.execute(
        sql`
          rollback;
        `,
      );
      throw error;
    }
  }

  /**
   * Execute an asynchronous function in a transaction. The transaction is `exclusive` to avoid issues with multiple asynchronous functions interleaving their transactions. This function is reserved for special cases, for example, migrations.
   */
  async transactionAsync<Type>(function_: () => Promise<Type>): Promise<Type> {
    this.execute(
      sql`
        begin exclusive;
      `,
    );
    try {
      const value = await function_();
      this.execute(
        sql`
          commit;
        `,
      );
      return value;
    } catch (error) {
      this.execute(
        sql`
          rollback;
        `,
      );
      throw error;
    }
  }

  /**
   * A background job system with the following features:
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
   * This method adds a background job to the queue, and `backgroundJobWorker()` defines the worker.
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
  backgroundJob({
    type,
    startAt = new Date().toISOString(),
    parameters = null,
  }: {
    type: string;
    startAt?: string;
    parameters?: any;
  }): void {
    this.run(
      sql`
        insert into "_backgroundJobs" (
          "type",
          "startAt",
          "parameters"
        )
        values (
          ${type},
          ${startAt},
          ${JSON.stringify(parameters)}
        );
      `,
    );
  }

  /**
   * This defined a background job worker. See `backgroundJob()`.
   */
  backgroundJobWorker<Type>(
    {
      type,
      timeout = 5 * 60 * 1000,
      retryIn = 5 * 60 * 1000,
      retries = 10,
      ...nodeSetTimeoutOptions
    }: {
      type: string;
      timeout?: number;
      retryIn?: number;
      retries?: number;
    } & Partial<Parameters<typeof node.setInterval>[0]>,
    function_: (parameters: Type) => void | Promise<void>,
  ): ReturnType<typeof node.setInterval> {
    return node.setInterval(
      { ...nodeSetTimeoutOptions, duration: 5000 },
      async () => {
        this.transaction(() => {
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
        this.transaction(() => {
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
          const backgroundJob = this.transaction<
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
              await function_(JSON.parse(backgroundJob.parameters));
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
      },
    );
  }

  /**
   * Schedule background jobs with a certain periodicity, similar to `cron`. The `schedule` uses the syntax of [`cron-parser`](https://npm.im/cron-parser).
   */
  scheduledBackgroundJobWorker(
    {
      schedule,
      ...sqliteBackgroundJobWorkerOptions
    }: {
      schedule: string;
    } & Parameters<typeof this.backgroundJobWorker>[0],
    function_: Parameters<typeof utilities.setInterval>[1],
  ): void {
    this.backgroundJobWorker(sqliteBackgroundJobWorkerOptions, function_);
    node.setInterval(
      { ...sqliteBackgroundJobWorkerOptions, duration: 5000 },
      () => {
        this.transaction(() => {
          const lastScheduledBackgroundJob = this.get<{
            id: number;
            lastScheduledAt: string;
          }>(
            sql`
              select "id", "lastScheduledAt"
              from "_scheduledBackgroundJobs"
              where "type" = ${sqliteBackgroundJobWorkerOptions.type};
            `,
          );
          if (
            lastScheduledBackgroundJob === undefined ||
            CronExpressionParser.parse(schedule, {
              currentDate: new Date(lastScheduledBackgroundJob.lastScheduledAt),
            })
              .next()
              .toISOString()! < new Date().toISOString()
          ) {
            this.run(
              sql`
                insert into "_backgroundJobs" (
                  "type",
                  "startAt",
                  "parameters"
                )
                values (
                  ${sqliteBackgroundJobWorkerOptions.type},
                  ${new Date().toISOString()},
                  ${JSON.stringify({})}
                );
              `,
            );
            if (lastScheduledBackgroundJob !== undefined)
              this.run(
                sql`
                  delete from "_scheduledBackgroundJobs" where "id" = ${lastScheduledBackgroundJob.id};
                `,
              );
            this.run(
              sql`
                insert into "_scheduledBackgroundJobs" (
                  "type",
                  "lastScheduledAt"
                )
                values (
                  ${sqliteBackgroundJobWorkerOptions.type},
                  ${new Date().toISOString()}
                );
              `,
            );
          }
        });
      },
    );
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
      for (const oldValueRow of this.all<{ id: number }>(
        sql`
          select "id"
          from "_cache"
          order by "usedAt" desc
          limit -1 offset ${this.cacheSize}
        `,
      ))
        this.run(
          sql`
            delete from "_cache" where "id" = ${oldValueRow.id};
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
      for (const oldValueRow of this.all<{ id: number }>(
        sql`
          select "id"
          from "_cache"
          order by "usedAt" desc
          limit -1 offset ${this.cacheSize}
        `,
      ))
        this.run(
          sql`
            delete from "_cache" where "id" = ${oldValueRow.id};
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

  #statements = new Map<string, sqlite.StatementSync>();
  #getStatement(source: string): sqlite.StatementSync {
    let statement = this.#statements.get(source);
    if (statement === undefined) {
      statement = this.prepare(source);
      this.#statements.set(source, statement);
    }
    return statement;
  }
}

/**
 * A database query. This is what’s generated by the `` sql`___` `` tagged template.
 */
export type Query = {
  source: string;
  parameters: (null | number | string | Buffer)[];
};

/**
 * A tagged template that generates a database query.
 *
 * You may interpolate values and query fragments, for example:
 *
 * ```typescript
 * sql`
 *   select "id", "name"
 *   from "users"
 *   where
 *     "name" = ${"Leandro Facchinetti"}
 *     ${shouldFilterByAge ? sql`and "age" = ${35}` : sql``};
 * `;
 * ```
 *
 * > **Note:** The interpolated values are turned into binding parameters to protect from SQL injection.
 */
export default function sql(
  templateStrings: TemplateStringsArray,
  ...substitutions: (null | number | string | Buffer | Query)[]
): Query {
  let source = "";
  const parameters = new Array<null | number | string | Buffer>();
  for (let index = 0; index < substitutions.length; index++) {
    const templateString = templateStrings[index];
    const substitution = substitutions[index];
    source += templateString;
    if (
      typeof substitution === "object" &&
      substitution !== null &&
      typeof (substitution as Query).source === "string" &&
      Array.isArray((substitution as any).parameters)
    ) {
      source += (substitution as Query).source;
      parameters.push(...(substitution as any).parameters);
    } else {
      source += "?";
      parameters.push(substitution as any);
    }
  }
  source += templateStrings.at(-1);
  return { source, parameters };
}
