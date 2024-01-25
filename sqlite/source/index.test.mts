import test from "node:test";
import assert from "node:assert/strict";
import timers from "node:timers/promises";
import sql, { Database, Query } from "./index.mjs";

test(async () => {
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

  assert.throws(() => {
    database.executeTransactionImmediate<void>(() => {
      database.run(
        sql`
          INSERT INTO "users" ("name") VALUES (${"Eliot Smith"})
        `,
      );
      throw new Error();
    });
  });
  assert.equal(
    database.get<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" = ${"Eliot Smith"}
      `,
    ),
    undefined,
  );
  assert.deepEqual(
    database.executeTransactionImmediate<ReturnType<Database["run"]>>(() => {
      return database.run(
        sql`
          INSERT INTO "users" ("name") VALUES (${"Eliot Smith"})
        `,
      );
    }),
    { changes: 1, lastInsertRowid: 5 },
  );
  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" = ${"Eliot Smith"}
      `,
    ),
    [{ id: 5, name: "Eliot Smith" }],
  );

  assert.throws(() => {
    database.executeTransactionExclusive<void>(() => {
      database.run(
        sql`
          INSERT INTO "users" ("name") VALUES (${"Aline"})
        `,
      );
      throw new Error();
    });
  });
  assert.equal(
    database.get<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" = ${"Aline"}
      `,
    ),
    undefined,
  );
  assert.deepEqual(
    database.executeTransactionExclusive<ReturnType<Database["run"]>>(() => {
      return database.run(
        sql`
          INSERT INTO "users" ("name") VALUES (${"Aline"})
        `,
      );
    }),
    { changes: 1, lastInsertRowid: 6 },
  );
  assert.deepEqual(
    database.all<{ id: number; name: string }>(
      sql`
        SELECT "id", "name" FROM "users" WHERE "name" = ${"Aline"}
      `,
    ),
    [{ id: 6, name: "Aline" }],
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
    await database.migrate(
      ...migrations,
      sql`
        INSERT INTO "posts" ("content", "author")
        VALUES (${"Nonexistent author."}, 999999);
      `,
    );
  });

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

  database.close();

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
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${sql` AND "age" IS NOT NULL`}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE name = `,
        ` AND "age" IS NOT NULL`,
      ],
      parameters: ["Leandro Facchinetti"],
    },
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${sql` AND "age" = ${33}`}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE name = `,
        ` AND "age" = `,
        ``,
      ],
      parameters: ["Leandro Facchinetti", 33],
    },
  );
  assert.throws(() => {
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${` AND "age" = ${33}`}`;
  });
});
