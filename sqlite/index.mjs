import sql, { Database } from "@radically-straightforward/sqlite";

const database = new Database("example.db");
database.pragma("journal_mode = WAL");
console.log(database.pragma("journal_mode"));
