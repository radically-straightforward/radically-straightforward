# Radically Straightforward · SQLite

**🗃️ SQLite with tagged templates, migrations, and other utilities**

## Installation

```console
$ npm install @radically-straightforward/sqlite
```

> **Note:** We recommend the **[ES6 String HTML](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)** Visual Studio Code extension to syntax highlight SQL in tagged templates.

> **Note:** We recommend **[DBeaver](https://dbeaver.io/)** to interact with the database, including visualizing the current schema (including an automatically generated entity–relationship diagram), testing queries, and so forth.

## Usage

```typescript
import sql, { Database } from "@radically-straightforward/sqlite";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `sql()`

```typescript
export default function sql(
  templateStrings: TemplateStringsArray,
  ...substitutions: (null | number | bigint | string | Buffer | Query)[]
): Query;
```

A tagged template that generates a database query.

You may interpolate values and query fragments, for example:

```javascript
sql`
  select "id", "name"
  from "users"
  where
    "name" = ${"Leandro Facchinetti"}
    ${shouldFilterByAge ? sql`and "age" = ${35}` : sql``};
`;
```

> **Note:** The interpolated values are turned into binding parameters to protect from SQL injection.

<!-- DOCUMENTATION END: ./source/index.mts -->
