import BetterSqlite3Database from "better-sqlite3";

export class Database extends BetterSqlite3Database {
  #statements = new Map<string, BetterSqlite3Database.Statement>();

  // https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes
  async migrate(
    ...migrations: (Query | ((database: this) => void | Promise<void>))[]
  ): Promise<void> {
    const foreignKeys =
      this.pragma<number>("foreign_keys", { simple: true }) === 1;
    if (foreignKeys) this.pragma<void>("foreign_keys = OFF");
    try {
      for (
        let migrationIndex = this.pragma<number>("user_version", {
          simple: true,
        });
        migrationIndex < migrations.length;
        migrationIndex++
      )
        try {
          this.execute(
            sql`
              BEGIN;
            `,
          );
          const migration = migrations[migrationIndex];
          if (typeof migration === "function") await migration(this);
          else this.execute(migration);
          if (foreignKeys) {
            const foreignKeyViolations =
              this.pragma<unknown[]>("foreign_key_check");
            if (foreignKeyViolations.length !== 0)
              throw new Error(
                `Foreign key violations in migration:\n${JSON.stringify(
                  foreignKeyViolations,
                  undefined,
                  2,
                )}`,
              );
          }
          this.pragma<void>(`user_version = ${migrationIndex + 1}`);
          this.execute(
            sql`
              COMMIT;
            `,
          );
        } catch (error) {
          this.execute(
            sql`
              ROLLBACK;
            `,
          );
          throw error;
        }
    } finally {
      if (foreignKeys) this.pragma<void>("foreign_keys = ON");
    }
  }

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
          `,
        )!.parameter;
    source += query.sourceParts.at(-1);
    return this.exec(source);
  }

  run(query: Query): BetterSqlite3Database.RunResult {
    return this.getStatement(query).run(...query.parameters);
  }

  get<T>(query: Query): T | undefined {
    return this.getStatement(query).get(...query.parameters) as T | undefined;
  }

  all<T>(query: Query): T[] {
    return this.getStatement(query).all(...query.parameters) as T[];
  }

  iterate<T>(query: Query): IterableIterator<T> {
    return this.getStatement(query).iterate(
      ...query.parameters,
    ) as IterableIterator<T>;
  }

  pragma<T>(source: string, options?: BetterSqlite3Database.PragmaOptions): T {
    return super.pragma(source, options) as T;
  }

  executeTransaction<T>(fn: () => T): T {
    return this.transaction(fn)();
  }

  executeTransactionImmediate<T>(fn: () => T): T {
    return this.transaction(fn).immediate();
  }

  executeTransactionExclusive<T>(fn: () => T): T {
    return this.transaction(fn).exclusive();
  }

  getStatement(query: Query): BetterSqlite3Database.Statement {
    const source = query.sourceParts.join("?");
    let statement = this.#statements.get(source);
    if (statement === undefined) {
      statement = this.prepare(source);
      this.#statements.set(source, statement);
    }
    return statement;
  }
}

export type Query = {
  sourceParts: string[];
  parameters: any[];
};

export default function sql(
  templateStrings: TemplateStringsArray,
  ...substitutions: any[]
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
      if (
        !Array.isArray(substitution.sourceParts) ||
        substitution.sourceParts.length === 0 ||
        substitution.sourceParts.some(
          (substitutionPart: any) => typeof substitutionPart !== "string",
        ) ||
        !Array.isArray(substitution.parameters) ||
        substitution.sourceParts.length !== substitution.parameters.length + 1
      )
        throw new Error(
          `Failed to interpolate raw query ‘${substitution}’ because it wasn’t created with the sql\`\` tagged template`,
        );
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
