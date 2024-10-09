import test from "node:test";
import assert from "node:assert/strict";
import timers from "node:timers/promises";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import sql, { Database, Query } from "@radically-straightforward/sqlite";

test("Database", async () => {
  const database = new Database(":memory:");

  const migrations: (Query | (() => void | Promise<void>))[] = [
    sql`
      create table "users" (
        "id" integer primary key autoincrement,
        "name" text not null
      ) strict;
      create table "posts" (
        "id" integer primary key autoincrement,
        "content" text not null,
        "author" integer not null references "users"
      ) strict;
    `,

    async () => {
      database.execute(
        sql`
          insert into "users" ("name") values (${"Leandro Facchinetti"});
        `,
      );
    },
  ];
  await database.migrate(...migrations);

  assert.deepEqual(
    database.run(
      sql`
        insert into "users" ("name") values (${"David Adler"});
      `,
    ),
    { changes: 1, lastInsertRowid: 2 },
  );

  assert.deepEqual(
    database.get<{ id: number; name: string }>(
      sql`
        insert into "users" ("name") values (${"Louie Renner"}) returning *;
      `,
    ),
    { id: 3, name: "Louie Renner" },
  );

  assert.deepEqual(
    database.get<{ id: number; name: string }>(
      sql`
        select "id", "name" from "users" where "id" = 1;
      `,
    ),
    { id: 1, name: "Leandro Facchinetti" },
  );

  assert.equal(
    database.get<{ id: number; name: string }>(
      sql`
        select "id", "name" from "users" where "id" = 500;
      `,
    ),
    undefined,
  );

  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        select "id", "name" from "users" order by "id" asc;
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
        select "id", "name" from "users" where "name" in ${[]};
      `,
    ),
    [],
  );

  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        select "id", "name" from "users" where "name" in ${[
          "Leandro Facchinetti",
          "David Adler",
        ]};
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
        select "id", "name" from "users" where "name" in ${new Set([
          "Leandro Facchinetti",
          "David Adler",
        ])};
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
          select "id", "name" from "users" order by "id" asc;
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
          insert into "users" ("name") values (${"Abigail Wall"});
        `,
      );
      throw new Error();
    });
  });
  assert.equal(
    database.get<{ id: number; name: string }>(
      sql`
        select "id", "name" from "users" where "name" = ${"Abigail Wall"};
      `,
    ),
    undefined,
  );
  assert.deepEqual(
    database.executeTransaction<ReturnType<Database["run"]>>(() => {
      return database.run(
        sql`
          insert into "users" ("name") values (${"Abigail Wall"});
        `,
      );
    }),
    { changes: 1, lastInsertRowid: 4 },
  );
  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        select "id", "name" from "users" where "name" = ${"Abigail Wall"};
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
          insert into "users" ("name") values (${"Jeppe"});
        `,
      );
      await timers.setTimeout();
      throw new Error("Rollback across ticks of the event loop.");
    });
  });
  assert.equal(
    database.get<{ id: number; name: string }>(
      sql`
        select "id", "name" from "users" where "name" = ${"Jeppe"};
      `,
    ),
    undefined,
  );

  database.cacheSize = 3;
  assert.equal(await database.cache("1", () => "1"), "1");
  await utilities.sleep(10);
  assert.equal(await database.cache("2", () => "2"), "2");
  await utilities.sleep(10);
  assert.equal(await database.cache("3", () => "3"), "3");
  await utilities.sleep(10);
  assert.equal(
    await database.cache("1", () => {
      throw new Error();
    }),
    "1",
  );
  await utilities.sleep(10);
  assert.equal(await database.cache("4", () => "4"), "4");
  await utilities.sleep(10);
  assert.equal(await database.cache("2", () => "a new 2"), "a new 2");

  assert.deepEqual(
    sql`create table "users" ("id" integer primary key autoincrement, "name" text);`,
    {
      sourceParts: [
        `create table "users" ("id" integer primary key autoincrement, "name" text);`,
      ],
      parameters: [],
    },
  );

  assert.deepEqual(
    sql`insert into "users" ("name") values (${"Leandro Facchinetti"});`,
    {
      sourceParts: [`insert into "users" ("name") values (`, `);`],
      parameters: ["Leandro Facchinetti"],
    },
  );

  assert.deepEqual(
    sql`select "id", "name" from "users" where "name" in ${[]};`,
    {
      sourceParts: [`select "id", "name" from "users" where "name" in ();`],
      parameters: [],
    },
  );

  assert.deepEqual(
    sql`select "id", "name" from "users" where "name" in ${[
      "Leandro Facchinetti",
      "David Adler",
    ]};`,
    {
      sourceParts: [
        `select "id", "name" from "users" where "name" in (`,
        `,`,
        `);`,
      ],
      parameters: ["Leandro Facchinetti", "David Adler"],
    },
  );

  assert.deepEqual(
    sql`select "id", "name" from "users" where "name" in ${new Set([])};`,
    {
      sourceParts: [`select "id", "name" from "users" where "name" in ();`],
      parameters: [],
    },
  );

  assert.deepEqual(
    sql`select "id", "name" from "users" where "name" in ${new Set([
      "Leandro Facchinetti",
      "David Adler",
    ])};`,
    {
      sourceParts: [
        `select "id", "name" from "users" where "name" in (`,
        `,`,
        `);`,
      ],
      parameters: ["Leandro Facchinetti", "David Adler"],
    },
  );

  assert.deepEqual(
    sql`select "id", "name" from "users" where "name" = ${"Leandro Facchinetti"}$${sql` and "age" is not null`};`,
    {
      sourceParts: [
        `select "id", "name" from "users" where "name" = `,
        ` and "age" is not null;`,
      ],
      parameters: ["Leandro Facchinetti"],
    },
  );

  assert.deepEqual(
    sql`select "id", "name" from "users" where "name" = ${"Leandro Facchinetti"}$${sql` and "age" = ${33}`};`,
    {
      sourceParts: [
        `select "id", "name" from "users" where "name" = `,
        ` and "age" = `,
        `;`,
      ],
      parameters: ["Leandro Facchinetti", 33],
    },
  );

  assert.throws(() => {
    sql`select "id", "name" from "users" where "name" = ${"Leandro Facchinetti"}$${` and "age" is not null`};`;
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
        insert into "_backgroundJobs" (
          "type",
          "startAt",
          "parameters"
        )
        values (
          ${"a-job-with-no-worker"},
          ${new Date().toISOString()},
          ${JSON.stringify(null)}
        );
      `,
    );

    database.run(
      sql`
        insert into "_backgroundJobs" (
          "type",
          "startAt",
          "startedAt",
          "retries",
          "parameters"
        )
        values (
          ${"a-job-which-was-left-behind"},
          ${new Date(Date.now() - 20 * 60 * 1000).toISOString()},
          ${new Date(Date.now() - 15 * 60 * 1000).toISOString()},
          ${0},
          ${JSON.stringify(null)}
        );
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
        insert into "_backgroundJobs" (
          "type",
          "startAt",
          "parameters"
        )
        values (
          ${"a-job-which-times-out"},
          ${new Date().toISOString()},
          ${JSON.stringify({ name: "Leandro" })}
        );
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
        insert into "_backgroundJobs" (
          "type",
          "startAt",
          "parameters"
        )
        values (
          ${"a-job-which-throws-an-exception"},
          ${new Date().toISOString()},
          ${JSON.stringify({ name: "Leandro" })}
        );
      `,
    );

    console.log("BackgroundJobs: Press ⌃Z to continue...");
    await new Promise((resolve) => process.once("SIGTSTP", resolve));

    node.exit();
  },
);
