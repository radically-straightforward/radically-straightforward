import BetterSqlite3Database from "better-sqlite3";

export type Options = {
  safeIntegers?: boolean;
};

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
          `,
        )!.parameter;
    source += query.sourceParts.at(-1);
    return this.exec(source);
  }

  run(query: Query, options: Options = {}): BetterSqlite3Database.RunResult {
    return this.getStatement(query, options).run(query.parameters);
  }

  get<T>(query: Query, options: Options = {}): T | undefined {
    return this.getStatement(query, options).get(query.parameters);
  }

  all<T>(query: Query, options: Options = {}): T[] {
    return this.getStatement(query, options).all(query.parameters);
  }

  iterate<T>(query: Query, options: Options = {}): IterableIterator<T> {
    return this.getStatement(query, options).iterate(query.parameters);
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
            `,
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
                  2,
                )}`,
              );
          }
          this.pragma(`user_version = ${migrationIndex + 1}`);
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
      if (foreignKeys) this.pragma("foreign_keys = ON");
    }
  }

  getStatement(
    query: Query,
    options: Options = {},
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
}

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
        sourceParts.push(
          `${templatePart}${substitutionQuery.sourceParts[0]}`,
          ...substitutionQuery.sourceParts.slice(1, -1),
        );
        templateParts[substitutionsIndex + 1] =
          `${substitutionQuery.sourceParts.at(-1)}${
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
          ...new Array(substitution.length - 1).fill(","),
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
