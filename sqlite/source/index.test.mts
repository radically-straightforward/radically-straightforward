import test from "node:test";
import assert from "node:assert/strict";
import timers from "node:timers/promises";
import * as node from "@radically-straightforward/node";
import sql, { Database, Query } from "@radically-straightforward/sqlite";

test("Database", async () => {
  const database = new Database(":memory:");

  const migrations: (Query | (() => void | Promise<void>))[] = [
    sql`
      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT
      );
      CREATE TABLE "posts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "content" TEXT,
        "author" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE
      );
    `,

    async () => {
      database.execute(
        sql`
          INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"});
        `,
      );
    },
  ];
  await database.migrate(...migrations);

  assert.deepEqual(
    database.run(
      sql`
        INSERT INTO "users" ("name") VALUES (${"David Adler"})
      `,
    ),
    { changes: 1, lastInsertRowid: 2 },
  );

  assert.deepEqual(
    database.get<{ id: number; name: string }>(
      sql`
        INSERT INTO "users" ("name") VALUES (${"Louie Renner"}) RETURNING *
      `,
    ),
    { id: 3, name: "Louie Renner" },
  );

  assert.deepEqual(
    database.get<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "id" = 1
      `,
    ),
    { id: 1, name: "Leandro Facchinetti" },
  );

  assert.equal(
    database.get<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "id" = 500
      `,
    ),
    undefined,
  );

  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" ORDER BY "id" ASC
      `,
    ),
    [
      { id: 1, name: "Leandro Facchinetti" },
      { id: 2, name: "David Adler" },
      { id: 3, name: "Louie Renner" },
    ],
  );

  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" IN ${[]}
      `,
    ),
    [],
  );

  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" IN ${[
          "Leandro Facchinetti",
          "David Adler",
        ]}
      `,
    ),
    [
      { id: 1, name: "Leandro Facchinetti" },
      { id: 2, name: "David Adler" },
    ],
  );

  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" IN ${new Set([
          "Leandro Facchinetti",
          "David Adler",
        ])}
      `,
    ),
    [
      { id: 1, name: "Leandro Facchinetti" },
      { id: 2, name: "David Adler" },
    ],
  );

  assert.deepEqual(
    [
      ...database.iterate<{ id: number; name: string }>(
        sql`
          SELECT "id", "name" FROM "users" ORDER BY "id" ASC
        `,
      ),
    ],
    [
      { id: 1, name: "Leandro Facchinetti" },
      { id: 2, name: "David Adler" },
      { id: 3, name: "Louie Renner" },
    ],
  );

  assert.equal(database.pragma<number>("foreign_keys", { simple: true }), 1);

  assert.throws(() => {
    database.executeTransaction<void>(() => {
      database.run(
        sql`
          INSERT INTO "users" ("name") VALUES (${"Abigail Wall"})
        `,
      );
      throw new Error();
    });
  });
  assert.equal(
    database.get<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" = ${"Abigail Wall"}
      `,
    ),
    undefined,
  );
  assert.deepEqual(
    database.executeTransaction<ReturnType<Database["run"]>>(() => {
      return database.run(
        sql`
          INSERT INTO "users" ("name") VALUES (${"Abigail Wall"})
        `,
      );
    }),
    { changes: 1, lastInsertRowid: 4 },
  );
  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" = ${"Abigail Wall"}
      `,
    ),
    [{ id: 4, name: "Abigail Wall" }],
  );

  let runsToCompletion = 0;
  migrations.push(() => {
    runsToCompletion++;
  });
  for (let iteration = 0; iteration < 5; iteration++) {
    await database.migrate(...migrations);
    assert.equal(runsToCompletion, 1);
  }

  await assert.rejects(async () => {
    await database.migrate(...migrations, async () => {
      database.execute(
        sql`
          INSERT INTO "users" ("name") VALUES (${"Jeppe"})
        `,
      );
      await timers.setTimeout();
      throw new Error("Rollback across ticks of the event loop.");
    });
  });
  assert.equal(
    database.get<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" = ${"Jeppe"}
      `,
    ),
    undefined,
  );

  assert.deepEqual(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`,
    {
      sourceParts: [
        `CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`,
      ],
      parameters: [],
    },
  );

  assert.deepEqual(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
    {
      sourceParts: [`INSERT INTO "users" ("name") VALUES (`, `)`],
      parameters: ["Leandro Facchinetti"],
    },
  );

  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[]}`,
    {
      sourceParts: [`SELECT "id", "name" FROM "users" WHERE "name" IN ()`],
      parameters: [],
    },
  );

  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[
      "Leandro Facchinetti",
      "David Adler",
    ]}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE "name" IN (`,
        `,`,
        `)`,
      ],
      parameters: ["Leandro Facchinetti", "David Adler"],
    },
  );

  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${new Set([])}`,
    {
      sourceParts: [`SELECT "id", "name" FROM "users" WHERE "name" IN ()`],
      parameters: [],
    },
  );

  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${new Set([
      "Leandro Facchinetti",
      "David Adler",
    ])}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE "name" IN (`,
        `,`,
        `)`,
      ],
      parameters: ["Leandro Facchinetti", "David Adler"],
    },
  );

  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" = ${"Leandro Facchinetti"}$${sql` AND "age" IS NOT NULL`}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE "name" = `,
        ` AND "age" IS NOT NULL`,
      ],
      parameters: ["Leandro Facchinetti"],
    },
  );

  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" = ${"Leandro Facchinetti"}$${sql` AND "age" = ${33}`}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE "name" = `,
        ` AND "age" = `,
        ``,
      ],
      parameters: ["Leandro Facchinetti", 33],
    },
  );

  assert.throws(() => {
    sql`SELECT "id", "name" FROM "users" WHERE "name" = ${"Leandro Facchinetti"}$${` AND "age" IS NOT NULL`}`;
  });
});

test(
  "backgroundJob()",
  {
    skip: process.stdin.isTTY
      ? false
      : `Run interactive test with ‘node ./build/index.test.mjs’.`,
  },
  async () => {
    const database = await new Database(":memory:").migrate();

    database.run(
      sql`
        INSERT INTO "_backgroundJobs" (
          "type",
          "startAt",
          "parameters"
        )
        VALUES (
          ${"a-job-with-no-worker"},
          ${new Date().toISOString()},
          ${JSON.stringify(null)}
        )
      `,
    );

    database.run(
      sql`
        INSERT INTO "_backgroundJobs" (
          "type",
          "startAt",
          "startedAt",
          "retries",
          "parameters"
        )
        VALUES (
          ${"a-job-which-was-left-behind"},
          ${new Date(Date.now() - 20 * 60 * 1000).toISOString()},
          ${new Date(Date.now() - 15 * 60 * 1000).toISOString()},
          ${0},
          ${JSON.stringify(null)}
        )
      `,
    );
    database.backgroundJob({ type: "a-job-which-was-left-behind" }, () => {});

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    database.backgroundJob(
      {
        type: "a-job-which-times-out",
        timeout: 1000,
        retries: 2,
      },
      async () => {
        await timers.setTimeout(5 * 1000);
      },
    );
    database.run(
      sql`
        INSERT INTO "_backgroundJobs" (
          "type",
          "startAt",
          "parameters"
        )
        VALUES (
          ${"a-job-which-times-out"},
          ${new Date().toISOString()},
          ${JSON.stringify({ name: "Leandro" })}
        )
      `,
    );

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    database.backgroundJob(
      {
        type: "a-job-which-throws-an-exception",
        retryIn: 1000,
        retries: 2,
      },
      async () => {
        throw new Error("AN ERROR");
      },
    );
    database.run(
      sql`
        INSERT INTO "_backgroundJobs" (
          "type",
          "startAt",
          "parameters"
        )
        VALUES (
          ${"a-job-which-throws-an-exception"},
          ${new Date().toISOString()},
          ${JSON.stringify({ name: "Leandro" })}
        )
      `,
    );

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    node.exit();
  },
);
