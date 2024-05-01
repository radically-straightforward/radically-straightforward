import childProcess from "node:child_process";
import timers from "node:timers/promises";
import * as utilities from "@radically-straightforward/utilities";
import sql, { Database } from "@radically-straightforward/sqlite";
import * as serverTypes from "@radically-straightforward/server";

let gracefulTerminationEmitted = false;
for (const signal of [
  "SIGINT",
  "SIGQUIT",
  "SIGBREAK",
  "SIGHUP",
  "SIGTERM",
  "SIGUSR2",
])
  process.on(signal, () => {
    if (gracefulTerminationEmitted) return;
    gracefulTerminationEmitted = true;
    setTimeout(() => {
      process.exit(1);
    }, 10 * 1000).unref();
    process.emit("gracefulTermination" as any);
  });

/**
 * This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `backgroundJob()` which adds support for graceful termination.
 *
 * **Example**
 *
 * ```javascript
 * import timers from "node:timers/promises";
 * import * as node from "@radically-straightforward/node";
 *
 * node.backgroundJob({ interval: 3 * 1000 }, async () => {
 *   console.log("backgroundJob(): Running background job...");
 *   await timers.setTimeout(3 * 1000);
 *   console.log("backgroundJob(): ...finished running background job.");
 * });
 * ```
 */
export function backgroundJob(
  {
    onStop,
    ...utilitiesBackgroundJobOptions
  }: Parameters<typeof utilities.backgroundJob>[0],
  job: Parameters<typeof utilities.backgroundJob>[1],
): ReturnType<typeof utilities.backgroundJob> {
  const backgroundJob = utilities.backgroundJob(
    {
      ...utilitiesBackgroundJobOptions,
      onStop: async () => {
        process.off("gracefulTermination", gracefulTerminationEventListener);
        await onStop?.();
      },
    },
    job,
  );
  const gracefulTerminationEventListener = () => {
    backgroundJob.stop();
  };
  process.once("gracefulTermination", gracefulTerminationEventListener);
  return backgroundJob;
}

/**
 * Keep a child process alive. If the child process crashes, respawn it. When the process gracefully terminates, gracefully terminate the child process as well.
 *
 * **Example**
 *
 * ```typescript
 * node.childProcessKeepAlive(() =>
 *   childProcess.spawn("node", ["--eval", `http.createServer().listen(18000)`], {
 *     stdio: "inherit",
 *   }),
 * );
 * ```
 */
export function childProcessKeepAlive(
  newChildProcess: () =>
    | ReturnType<(typeof childProcess)["spawn"]>
    | Promise<ReturnType<(typeof childProcess)["spawn"]>>,
): void {
  let childProcessInstance: ReturnType<(typeof childProcess)["spawn"]>;
  backgroundJob(
    {
      interval: 200,
      onStop: () => {
        childProcessInstance.kill();
      },
    },
    async () => {
      childProcessInstance = await newChildProcess();
      await new Promise((resolve) => {
        childProcessInstance.once("close", resolve);
      });
    },
  );
}

export class BackgroundJobs {
  #database: Database;
  #server: serverTypes.Server | undefined;

  constructor(database: Database, server?: serverTypes.Server) {
    this.#database = database;
    this.#server = server;
    this.#database.executeTransaction(() => {
      this.#database.execute(sql`
        CREATE TABLE IF NOT EXISTS "_backgroundJobs" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "type" TEXT NOT NULL,
          "startAt" TEXT NOT NULL,
          "startedAt" TEXT NULL,
          "retries" INTEGER NOT NULL,
          "parameters" TEXT NOT NULL
        ) STRICT;
        CREATE INDEX IF NOT EXISTS "_backgroundJobsType" ON "_backgroundJobs" ("type");
        CREATE INDEX IF NOT EXISTS "_backgroundJobsStartAt" ON "_backgroundJobs" ("startAt");
        CREATE INDEX IF NOT EXISTS "_backgroundJobsStartedAt" ON "_backgroundJobs" ("startedAt");
        CREATE INDEX IF NOT EXISTS "_backgroundJobsRetries" ON "_backgroundJobs" ("retries");
      `);
    });
  }

  add({
    type,
    startIn = 0,
    parameters = null,
  }: {
    type: string;
    startIn?: number;
    parameters?: Parameters<typeof JSON.stringify>[0];
  }): void {
    const jobId = this.#database.run(sql`
      INSERT INTO "_backgroundJobs" (
        "type",
        "startAt",
        "retries",
        "parameters"
      )
      VALUES (
        ${type},
        ${new Date(Date.now() + startIn).toISOString()},
        ${0},
        ${JSON.stringify(parameters)}
      )
    `).lastInsertRowid;
    utilities.log("BACKGROUND JOB ADD", type, String(jobId));
  }

  worker<Type>(
    {
      type,
      timeout = 10 * 60 * 1000,
      retryIn = 5 * 60 * 1000,
      retries = 10,
      ...nodeBackgroundJobOptions
    }: {
      type: string;
      timeout?: number;
      retryIn?: number;
      retries?: number;
    } & Parameters<typeof backgroundJob>[0],
    job: (parameters: Type) => void | Promise<void>,
  ): ReturnType<typeof backgroundJob> {
    const workerBackgroundJob = backgroundJob(
      nodeBackgroundJobOptions,
      async () => {
        this.#database.executeTransaction(() => {
          for (const backgroundJob of this.#database.all<{
            id: number;
            retries: number;
            parameters: string;
          }>(sql`
              SELECT "id", "retries", "parameters"
              FROM "_backgroundJobs"
              WHERE
                "type" = ${type} AND
                "startedAt" IS NOT NULL AND
                "startedAt" < ${new Date(Date.now() - timeout).toISOString()}
            `)) {
            utilities.log(
              "BACKGROUND JOB EXTERNAL TIMEOUT",
              type,
              String(backgroundJob.id),
              backgroundJob.retries === 0 ? backgroundJob.parameters : "",
            );
            this.#database.run(sql`
              UPDATE "_backgroundJobs"
              SET
                "startAt" = ${new Date(Date.now()).toISOString()},
                "startedAt" = NULL,
                "retries" = ${backgroundJob.retries + 1}
              WHERE "id" = ${backgroundJob.id}
            `);
          }
        });
        this.#database.executeTransaction(() => {
          for (const backgroundJob of this.#database.all<{
            id: number;
          }>(sql`
              SELECT "id"
              FROM "_backgroundJobs"
              WHERE
                "type" = ${type} AND
                ${retries} <= "retries"
            `)) {
            utilities.log(
              "BACKGROUND JOB FAIL",
              type,
              String(backgroundJob.id),
            );
            this.#database.run(sql`
              DELETE FROM "_backgroundJobs" WHERE "id" = ${backgroundJob.id}
            `);
          }
        });
        while (true) {
          const backgroundJob = this.#database.executeTransaction<
            { id: number; retries: number; parameters: string } | undefined
          >(() => {
            const backgroundJob = this.#database.get<{
              id: number;
              retries: number;
              parameters: string;
            }>(sql`
                SELECT "id", "retries", "parameters"
                FROM "_backgroundJobs"
                WHERE
                  "type" = ${type} AND
                  "startAt" <= ${new Date().toISOString()} AND
                  "startedAt" IS NULL
                ORDER BY "id" ASC
                LIMIT 1
              `);
            if (backgroundJob === undefined) return undefined;
            this.#database.run(sql`
              UPDATE "_backgroundJobs"
              SET "startedAt" = ${new Date().toISOString()}
              WHERE "id" = ${backgroundJob.id}
            `);
            return backgroundJob;
          });
          if (backgroundJob === undefined) break;
          const start = process.hrtime.bigint();
          try {
            utilities.log(
              "BACKGROUND JOB START",
              type,
              String(backgroundJob.id),
            );
            await utilities.timeout(timeout, async () => {
              await job(JSON.parse(backgroundJob.parameters));
            });
            this.#database.run(sql`
              DELETE FROM "_backgroundJobs" WHERE "id" = ${backgroundJob.id}
            `);
            utilities.log(
              "BACKGROUND JOB SUCCESS",
              type,
              String(backgroundJob.id),
              `${(process.hrtime.bigint() - start) / 1_000_000n}ms`,
            );
          } catch (error) {
            utilities.log(
              "BACKGROUND JOB ERROR",
              type,
              String(backgroundJob.id),
              `${(process.hrtime.bigint() - start) / 1_000_000n}ms`,
              backgroundJob.retries === 0 ? backgroundJob.parameters : "",
              String(error),
              (error as Error)?.stack ?? "",
            );
            this.#database.run(sql`
              UPDATE "_backgroundJobs"
              SET
                "startAt" = ${new Date(Date.now() + retryIn).toISOString()},
                "startedAt" = NULL,
                "retries" = ${backgroundJob.retries + 1}
              WHERE "id" = ${backgroundJob.id}
            `);
          }
          await timers.setTimeout(200);
        }
      },
    );
    this.#server?.push({
      method: "POST",
      pathname: `/${type}`,
      handler: (request, response) => {
        response.once("close", async () => {
          workerBackgroundJob.run();
        });
        response.end();
      },
    });
    return workerBackgroundJob;
  }
}
