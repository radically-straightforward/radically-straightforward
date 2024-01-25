import test from "node:test";
import assert from "node:assert/strict";
import sql, { Database } from "./index.mjs";

test("Database.execute()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`
      CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);
      INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"});
    `,
  );
  assert.equal(
    database.get<{ name: string }>(sql`SELECT * FROM "users"`)!.name,
    "Leandro Facchinetti",
  );
  database.close();
});

test("Database.run()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
  );
  assert.deepEqual(
    database.run(
      sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
    ),
    { changes: 1, lastInsertRowid: 1 },
  );
  database.close();
});

test("Database.get()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
  );
  assert.deepEqual(
    database.get<{ id: number; name: string }>(
      sql`
        INSERT INTO "users" ("name")
        VALUES (${"Leandro Facchinetti"})
        RETURNING *
      `,
    ),
    { id: 1, name: "Leandro Facchinetti" },
  );
  assert.deepEqual(
    database.get<{ id: number; name: string }>(
      sql`SELECT "id", "name" FROM "users"`,
    ),
    {
      id: 1,
      name: "Leandro Facchinetti",
    },
  );
  database.close();
});

test("Database.all()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
  );
  database.run(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
  );
  database.run(sql`INSERT INTO "users" ("name") VALUES (${"Abigail Wall"})`);
  database.run(
    sql`
      INSERT INTO "users" ("name") VALUES (${"David Adler"})
    `,
  );
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [
      {
        id: 1,
        name: "Leandro Facchinetti",
      },
      {
        id: 2,
        name: "Abigail Wall",
      },
      {
        id: 3,
        name: "David Adler",
      },
    ],
  );
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[]}`,
    ),
    [],
  );
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[
        "Leandro Facchinetti",
        "David Adler",
      ]}`,
    ),
    [
      {
        id: 1,
        name: "Leandro Facchinetti",
      },
      {
        id: 3,
        name: "David Adler",
      },
    ],
  );
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${new Set([
        "Leandro Facchinetti",
        "David Adler",
      ])}`,
    ),
    [
      {
        id: 1,
        name: "Leandro Facchinetti",
      },
      {
        id: 3,
        name: "David Adler",
      },
    ],
  );
  database.close();
});

test("Database.iterate()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
  );
  database.run(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
  );
  database.run(sql`INSERT INTO "users" ("name") VALUES (${"Abigail Wall"})`);
  assert.deepEqual(
    [
      ...database.iterate<{ name: string }>(
        sql`SELECT "id", "name" FROM "users"`,
      ),
    ],
    [
      {
        id: 1,
        name: "Leandro Facchinetti",
      },
      {
        id: 2,
        name: "Abigail Wall",
      },
    ],
  );
  database.close();
});

test("Database.executeTransaction()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
  );
  assert.throws(() => {
    database.executeTransaction(() => {
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
      );
      throw new Error("Rollback");
    });
  });
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [],
  );
  assert.deepEqual(
    database.executeTransaction(() => {
      return database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
      );
    }),
    {
      changes: 1,
      lastInsertRowid: 1,
    },
  );
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [
      {
        id: 1,
        name: "Leandro Facchinetti",
      },
    ],
  );
  database.close();
});

test("Database.executeTransactionImmediate()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
  );
  assert.throws(() => {
    database.executeTransactionImmediate(() => {
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
      );
      throw new Error("Rollback");
    });
  });
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [],
  );
  assert.deepEqual(
    database.executeTransactionImmediate(() => {
      return database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
      );
    }),
    {
      changes: 1,
      lastInsertRowid: 1,
    },
  );
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [
      {
        id: 1,
        name: "Leandro Facchinetti",
      },
    ],
  );
  database.close();
});

test("Database.executeTransactionExclusive()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
  );
  assert.throws(() => {
    database.executeTransactionExclusive(() => {
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
      );
      throw new Error("Rollback");
    });
  });
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [],
  );
  assert.deepEqual(
    database.executeTransactionExclusive(() => {
      return database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
      );
    }),
    {
      changes: 1,
      lastInsertRowid: 1,
    },
  );
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [
      {
        id: 1,
        name: "Leandro Facchinetti",
      },
    ],
  );
  database.close();
});

test("Database.migrate()", async () => {
  const database = new Database(":memory:");
  let counter = 0;
  await database.migrate(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
    () => {
      counter++;
    },
  );
  assert.equal(counter, 1);
  await database.migrate(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
    () => {
      counter++;
    },
  );
  assert.equal(counter, 1);
  await database.migrate(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
    () => {
      counter++;
    },
    () => {
      counter++;
    },
  );
  assert.equal(counter, 2);
  await assert.rejects(async () => {
    await database.migrate(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
      () => {
        counter++;
      },
      () => {
        counter++;
      },
      (database) => {
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
        );
      },
      () => {
        throw new Error(
          "The previous migration should succeed, but this migration should fail",
        );
      },
    );
  });
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [{ id: 1, name: "Leandro Facchinetti" }],
  );
  assert(database.pragma("foreign_keys", { simple: true }) === 1);
  await assert.rejects(async () => {
    await database.migrate(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
      () => {
        counter++;
      },
      () => {
        counter++;
      },
      (database) => {
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
        );
      },
      sql`
        CREATE TABLE "posts" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "title" TEXT,
          "content" TEXT,
          "author" REFERENCES "users" ("id") ON DELETE SET NULL
        );
      `,
      sql`
        INSERT INTO "posts" ("title", "content", "author")
        VALUES (
          'The Non-Existing Author Should Cause the Migration to Fail',
          'We turn off foreign keys so that migrations can alter the schema of existing tables, but we check foreign keys before we complete the migration.',
          999999
        );
      `,
    );
  });
  await assert.rejects(async () => {
    await database.migrate(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
      () => {
        counter++;
      },
      () => {
        counter++;
      },
      (database) => {
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
        );
      },
      sql`
        CREATE TABLE "posts" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "title" TEXT,
          "content" TEXT,
          "author" REFERENCES "users" ("id") ON DELETE SET NULL
        );
      `,
      async (database) => {
        database.execute(
          sql`INSERT INTO "users" ("name") VALUES (${"Abigail Wall"})`,
        );
        await Promise.resolve();
        throw new Error("Should rollback across ticks of the event loop");
      },
    );
  });
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
    ),
    [
      {
        id: 1,
        name: "Leandro Facchinetti",
      },
    ],
  );
  database.close();
});

test("Database.getStatement()", () => {
  const database = new Database(":memory:");
  database.execute(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
  );
  assert.deepEqual(
    database.run(
      sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
    ),
    {
      changes: 1,
      lastInsertRowid: 1,
    },
  );
  assert.deepEqual(
    database.run(sql`INSERT INTO "users" ("name") VALUES (${"Abigail Wall"})`, {
      safeIntegers: true,
    }),
    {
      changes: 1,
      lastInsertRowid: 2n,
    },
  );
  assert.deepEqual(
    database.run(sql`INSERT INTO "users" ("name") VALUES (${"Louie Renner"})`),
    {
      changes: 1,
      lastInsertRowid: 3n,
    },
  );
  assert.deepEqual(
    database.run(sql`INSERT INTO "users" ("name") VALUES (${"Eliot Smith"})`, {
      safeIntegers: false,
    }),
    {
      changes: 1,
      lastInsertRowid: 4,
    },
  );
  assert.deepEqual(
    database.get<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
      {
        safeIntegers: true,
      },
    ),
    {
      id: 1n,
      name: "Leandro Facchinetti",
    },
  );
  assert.deepEqual(
    database.all<{ name: string }>(
      sql`
        SELECT "id", "name" FROM "users"
      `,
      {
        safeIntegers: true,
      },
    ),
    [
      {
        id: 1n,
        name: "Leandro Facchinetti",
      },
      {
        id: 2n,
        name: "Abigail Wall",
      },
      {
        id: 3n,
        name: "Louie Renner",
      },
      {
        id: 4n,
        name: "Eliot Smith",
      },
    ],
  );
  assert.deepEqual(
    [
      ...database.iterate<{ name: string }>(
        sql`SELECT "id", "name" FROM "users"`,
        {
          safeIntegers: true,
        },
      ),
    ],
    [
      {
        id: 1n,
        name: "Leandro Facchinetti",
      },
      {
        id: 2n,
        name: "Abigail Wall",
      },
      {
        id: 3n,
        name: "Louie Renner",
      },
      {
        id: 4n,
        name: "Eliot Smith",
      },
    ],
  );
  database.close();
});

test("sql`___`", () => {
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
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${sql` AND "age" = ${31}`}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE name = `,
        ` AND "age" = `,
        ``,
      ],
      parameters: ["Leandro Facchinetti", 31],
    },
  );
  assert.throws(() => {
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${` AND "age" = ${31}`}`;
  });
});
