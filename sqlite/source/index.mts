import assert from "node:assert/strict";
import BetterSqlite3Database from "better-sqlite3";

export type Options = {
  safeIntegers?: boolean;
};

export type Query = {
  sourceParts: string[];
  parameters: any[];
};

export default function sql(
  template: TemplateStringsArray,
  ...substitutions: any[]
): Query {
  const templateParts = [...template];
  const sourceParts: string[] = [];
  const parameters: any[] = [];
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
      if (
        !Array.isArray(substitution.sourceParts) ||
        substitution.sourceParts.length === 0 ||
        substitution.sourceParts.some(
          (substitutionPart: any) => typeof substitutionPart !== "string"
        ) ||
        !Array.isArray(substitution.parameters) ||
        substitution.sourceParts.length !== substitution.parameters.length + 1
      )
        throw new Error(
          `Failed to interpolate raw query ‘${substitution}’ because it wasn’t created with the sql\`\` tagged template`
        );
      const substitutionQuery = substitution as Query;
      if (substitutionQuery.sourceParts.length === 1)
        templateParts[substitutionsIndex + 1] = `${templatePart}${
          substitutionQuery.sourceParts[0]
        }${templateParts[substitutionsIndex + 1]}`;
      else {
        sourceParts.push(
          `${templatePart}${substitutionQuery.sourceParts[0]}`,
          ...substitutionQuery.sourceParts.slice(1, -1)
        );
        templateParts[
          substitutionsIndex + 1
        ] = `${substitutionQuery.sourceParts.at(-1)}${
          templateParts[substitutionsIndex + 1]
        }`;
        parameters.push(...substitutionQuery.parameters);
      }
    } else if (Array.isArray(substitution)) {
      if (substitution.length === 0)
        templateParts[substitutionsIndex + 1] = `${templatePart}()${
          templateParts[substitutionsIndex + 1]
        }`;
      else {
        sourceParts.push(
          `${templatePart}(`,
          ...new Array(substitution.length - 1).fill(",")
        );
        templateParts[substitutionsIndex + 1] = `)${
          templateParts[substitutionsIndex + 1]
        }`;
        parameters.push(...substitution);
      }
    } else {
      sourceParts.push(templatePart);
      parameters.push(substitution);
    }
  }
  sourceParts.push(templateParts.at(-1)!);
  return { sourceParts, parameters };
}

if (process.env.TEST === "@leafac/sqlite") {
  assert.deepEqual(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`,
    {
      sourceParts: [
        `CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`,
      ],
      parameters: [],
    }
  );
  assert.deepEqual(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
    {
      sourceParts: [`INSERT INTO "users" ("name") VALUES (`, `)`],
      parameters: ["Leandro Facchinetti"],
    }
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[]}`,
    {
      sourceParts: [`SELECT "id", "name" FROM "users" WHERE "name" IN ()`],
      parameters: [],
    }
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
    }
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${new Set([])}`,
    {
      sourceParts: [`SELECT "id", "name" FROM "users" WHERE "name" IN ()`],
      parameters: [],
    }
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
    }
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${sql` AND "age" IS NOT NULL`}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE name = `,
        ` AND "age" IS NOT NULL`,
      ],
      parameters: ["Leandro Facchinetti"],
    }
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
    }
  );
  assert.throws(() => {
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${` AND "age" = ${31}`}`;
  });
}

// FIXME: Use BetterSqlite3Database generics: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794
// FIXME: In BetterSqlite3Database types, make ‘filename’ optional, in which case a temporary database is created (see https://www.sqlite.org/inmemorydb.html § Temporary Databases)
// FIXME: In BetterSqlite3Database types, make BindParameters more specific than ‘any’
export class Database extends BetterSqlite3Database {
  #statements: Map<string, BetterSqlite3Database.Statement> = new Map();

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
            SELECT quote(${query.parameters[parametersIndex]}) AS "parameter"
          `
        )!.parameter;
    source += query.sourceParts.at(-1);
    return this.exec(source);
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`
          CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);
          INSERT INTO "users" ("name") VALUES (${"Eliot Smith"});
        `
      );
      assert.equal(
        database.get<{ name: string }>(sql`SELECT * FROM "users"`)!.name,
        "Eliot Smith"
      );
      database.close();
    }
  }

  run(query: Query, options: Options = {}): BetterSqlite3Database.RunResult {
    return this.getStatement(query, options).run(query.parameters);
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        ),
        { changes: 1, lastInsertRowid: 1 }
      );
      database.close();
    }
  }

  get<T>(query: Query, options: Options = {}): T | undefined {
    return this.getStatement(query, options).get(query.parameters);
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.deepEqual(
        database.get<{ id: number; name: string }>(
          sql`
            INSERT INTO "users" ("name")
            VALUES (${"Leandro Facchinetti"})
            RETURNING *
          `
        ),
        { id: 1, name: "Leandro Facchinetti" }
      );
      assert.deepEqual(
        database.get<{ id: number; name: string }>(
          sql`SELECT "id", "name" FROM "users"`
        ),
        {
          id: 1,
          name: "Leandro Facchinetti",
        }
      );
      database.close();
    }
  }

  all<T>(query: Query, options: Options = {}): T[] {
    return this.getStatement(query, options).all(query.parameters);
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
      );
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Linda Renner"})`
      );
      database.run(
        sql`
          INSERT INTO "users" ("name") VALUES (${"David Adler"})
        `
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
          {
            id: 2,
            name: "Linda Renner",
          },
          {
            id: 3,
            name: "David Adler",
          },
        ]
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[]}`
        ),
        []
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[
            "Leandro Facchinetti",
            "David Adler",
          ]}`
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
        ]
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${new Set([
            "Leandro Facchinetti",
            "David Adler",
          ])}`
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
        ]
      );
      database.close();
    }
  }

  iterate<T>(query: Query, options: Options = {}): IterableIterator<T> {
    return this.getStatement(query, options).iterate(query.parameters);
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
      );
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Linda Renner"})`
      );
      assert.deepEqual(
        [
          ...database.iterate<{ name: string }>(
            sql`SELECT "id", "name" FROM "users"`
          ),
        ],
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
          {
            id: 2,
            name: "Linda Renner",
          },
        ]
      );
      database.close();
    }
  }

  executeTransaction<T>(fn: () => T): T {
    return this.transaction(fn)();
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.throws(() => {
        database.executeTransaction(() => {
          database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
          throw new Error("Rollback");
        });
      });
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        []
      );
      assert.deepEqual(
        database.executeTransaction(() => {
          return database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
        }),
        {
          changes: 1,
          lastInsertRowid: 1,
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
        ]
      );
      database.close();
    }
  }

  executeTransactionImmediate<T>(fn: () => T): T {
    return this.transaction(fn).immediate();
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.throws(() => {
        database.executeTransactionImmediate(() => {
          database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
          throw new Error("Rollback");
        });
      });
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        []
      );
      assert.deepEqual(
        database.executeTransactionImmediate(() => {
          return database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
        }),
        {
          changes: 1,
          lastInsertRowid: 1,
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
        ]
      );
      database.close();
    }
  }

  executeTransactionExclusive<T>(fn: () => T): T {
    return this.transaction(fn).exclusive();
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.throws(() => {
        database.executeTransactionExclusive(() => {
          database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
          throw new Error("Rollback");
        });
      });
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        []
      );
      assert.deepEqual(
        database.executeTransactionExclusive(() => {
          return database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
        }),
        {
          changes: 1,
          lastInsertRowid: 1,
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
        ]
      );
      database.close();
    }
  }

  // https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes
  async migrate(
    ...migrations: (Query | ((database: this) => void | Promise<void>))[]
  ): Promise<void> {
    const foreignKeys = this.pragma("foreign_keys", { simple: true }) === 1;
    if (foreignKeys) this.pragma("foreign_keys = OFF");
    try {
      for (
        let migrationIndex = this.pragma("user_version", { simple: true });
        migrationIndex < migrations.length;
        migrationIndex++
      )
        try {
          this.execute(
            sql`
              BEGIN;
            `
          );
          const migration = migrations[migrationIndex];
          if (typeof migration === "function") await migration(this);
          else this.execute(migration);
          if (foreignKeys) {
            const foreignKeyViolations = this.pragma("foreign_key_check");
            if (foreignKeyViolations.length !== 0)
              throw new Error(
                `Foreign key violations in migration:\n${JSON.stringify(
                  foreignKeyViolations,
                  undefined,
                  2
                )}`
              );
          }
          this.pragma(`user_version = ${migrationIndex + 1}`);
          this.execute(
            sql`
              COMMIT;
            `
          );
        } catch (error) {
          this.execute(
            sql`
              ROLLBACK;
            `
          );
          throw error;
        }
    } finally {
      if (foreignKeys) this.pragma("foreign_keys = ON");
    }
  }

  static {
    if (process.env.TEST === "@leafac/sqlite")
      (async () => {
        const database = new Database(":memory:");
        let counter = 0;
        await database.migrate(
          sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
          () => {
            counter++;
          }
        );
        assert.equal(counter, 1);
        await database.migrate(
          sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
          () => {
            counter++;
          }
        );
        assert.equal(counter, 1);
        await database.migrate(
          sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
          () => {
            counter++;
          },
          () => {
            counter++;
          }
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
                sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
              );
            },
            () => {
              throw new Error(
                "The previous migration should succeed, but this migration should fail"
              );
            }
          );
        });
        assert.deepEqual(
          database.all<{ name: string }>(
            sql`
              SELECT "id", "name" FROM "users"
            `
          ),
          [{ id: 1, name: "Leandro Facchinetti" }]
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
                sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
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
            `
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
                sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
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
                sql`INSERT INTO "users" ("name") VALUES (${"Linda Renner"})`
              );
              await Promise.resolve();
              throw new Error("Should rollback across ticks of the event loop");
            }
          );
        });
        assert.deepEqual(
          database.all<{ name: string }>(
            sql`
              SELECT "id", "name" FROM "users"
            `
          ),
          [
            {
              id: 1,
              name: "Leandro Facchinetti",
            },
          ]
        );
        database.close();
      })();
  }

  getStatement(
    query: Query,
    options: Options = {}
  ): BetterSqlite3Database.Statement {
    const source = query.sourceParts.join("?");
    let statement = this.#statements.get(source);
    if (statement === undefined) {
      statement = this.prepare(source);
      this.#statements.set(source, statement);
    }
    if (typeof options.safeIntegers === "boolean")
      statement.safeIntegers(options.safeIntegers);
    return statement;
  }

  static {
    if (process.env.TEST === "@leafac/sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        ),
        {
          changes: 1,
          lastInsertRowid: 1,
        }
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Linda Renner"})`,
          { safeIntegers: true }
        ),
        {
          changes: 1,
          lastInsertRowid: 2n,
        }
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Louie Renner"})`
        ),
        {
          changes: 1,
          lastInsertRowid: 3n,
        }
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Cadeau Renner"})`,
          { safeIntegers: false }
        ),
        {
          changes: 1,
          lastInsertRowid: 4,
        }
      );
      assert.deepEqual(
        database.get<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `,
          {
            safeIntegers: true,
          }
        ),
        {
          id: 1n,
          name: "Leandro Facchinetti",
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `,
          {
            safeIntegers: true,
          }
        ),
        [
          {
            id: 1n,
            name: "Leandro Facchinetti",
          },
          {
            id: 2n,
            name: "Linda Renner",
          },
          {
            id: 3n,
            name: "Louie Renner",
          },
          {
            id: 4n,
            name: "Cadeau Renner",
          },
        ]
      );
      assert.deepEqual(
        [
          ...database.iterate<{ name: string }>(
            sql`SELECT "id", "name" FROM "users"`,
            {
              safeIntegers: true,
            }
          ),
        ],
        [
          {
            id: 1n,
            name: "Leandro Facchinetti",
          },
          {
            id: 2n,
            name: "Linda Renner",
          },
          {
            id: 3n,
            name: "Louie Renner",
          },
          {
            id: 4n,
            name: "Cadeau Renner",
          },
        ]
      );
      database.close();
    }
  }
}
