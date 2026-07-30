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
    `,

    async () => {
      database.run(
        sql`
          insert into "users" ("name") values (${"Leandro Facchinetti"});
        `,
      );
    },
  ];
  await database.migrate(...migrations);

  // assert.deepEqual(
  //   database.run(
  //     sql`
  //       insert into "users" ("name") values (${"David Adler"});
  //     `,
  //   ),
  //   { changes: 1, lastInsertRowid: 2 },
  // );

  // assert.deepEqual(
  //   database.get<{ id: number; name: string }>(
  //     sql`
  //       insert into "users" ("name") values (${"Ali Madooei"}) returning *;
  //     `,
  //   ),
  //   { id: 3, name: "Ali Madooei" },
  // );

  // assert.deepEqual(
  //   database.get<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" where "id" = 1;
  //     `,
  //   ),
  //   { id: 1, name: "Leandro Facchinetti" },
  // );

  // assert.equal(
  //   database.get<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" where "id" = 500;
  //     `,
  //   ),
  //   undefined,
  // );

  // assert.deepEqual(
  //   database.all<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" order by "id" asc;
  //     `,
  //   ),
  //   [
  //     { id: 1, name: "Leandro Facchinetti" },
  //     { id: 2, name: "David Adler" },
  //     { id: 3, name: "Ali Madooei" },
  //   ],
  // );

  // assert.deepEqual(
  //   database.all<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" where "name" in ${[]};
  //     `,
  //   ),
  //   [],
  // );

  // assert.deepEqual(
  //   database.all<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" where "name" in ${[
  //         "Leandro Facchinetti",
  //         "David Adler",
  //       ]};
  //     `,
  //   ),
  //   [
  //     { id: 1, name: "Leandro Facchinetti" },
  //     { id: 2, name: "David Adler" },
  //   ],
  // );

  // assert.deepEqual(
  //   database.all<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" where "name" in ${new Set([
  //         "Leandro Facchinetti",
  //         "David Adler",
  //       ])};
  //     `,
  //   ),
  //   [
  //     { id: 1, name: "Leandro Facchinetti" },
  //     { id: 2, name: "David Adler" },
  //   ],
  // );

  // assert.deepEqual(
  //   [
  //     ...database.iterate<{ id: number; name: string }>(
  //       sql`
  //         select "id", "name" from "users" order by "id" asc;
  //       `,
  //     ),
  //   ],
  //   [
  //     { id: 1, name: "Leandro Facchinetti" },
  //     { id: 2, name: "David Adler" },
  //     { id: 3, name: "Ali Madooei" },
  //   ],
  // );

  // assert.equal(database.pragma<number>("foreign_keys", { simple: true }), 1);

  // assert.throws(() => {
  //   database.executeTransaction<void>(() => {
  //     database.run(
  //       sql`
  //         insert into "users" ("name") values (${"Scott Smith"});
  //       `,
  //     );
  //     throw new Error();
  //   });
  // });
  // assert.equal(
  //   database.get<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" where "name" = ${"Scott Smith"};
  //     `,
  //   ),
  //   undefined,
  // );
  // assert.deepEqual(
  //   database.executeTransaction<ReturnType<Database["run"]>>(() => {
  //     return database.run(
  //       sql`
  //         insert into "users" ("name") values (${"Scott Smith"});
  //       `,
  //     );
  //   }),
  //   { changes: 1, lastInsertRowid: 4 },
  // );
  // assert.deepEqual(
  //   database.all<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" where "name" = ${"Scott Smith"};
  //     `,
  //   ),
  //   [{ id: 4, name: "Scott Smith" }],
  // );

  // let runsToCompletion = 0;
  // migrations.push(() => {
  //   runsToCompletion++;
  // });
  // for (let iteration = 0; iteration < 5; iteration++) {
  //   await database.migrate(...migrations);
  //   assert.equal(runsToCompletion, 1);
  // }

  // await assert.rejects(async () => {
  //   await database.migrate(...migrations, async () => {
  //     database.execute(
  //       sql`
  //         insert into "users" ("name") values (${"Jeppe"});
  //       `,
  //     );
  //     await timers.setTimeout();
  //     throw new Error("Rollback across ticks of the event loop.");
  //   });
  // });
  // assert.equal(
  //   database.get<{ id: number; name: string }>(
  //     sql`
  //       select "id", "name" from "users" where "name" = ${"Jeppe"};
  //     `,
  //   ),
  //   undefined,
  // );

  // database.cacheSize = 3;
  // assert.equal(
  //   database.cache("1", () => "1"),
  //   "1",
  // );
  // await utilities.sleep(10);
  // assert.equal(
  //   database.cache("2", () => "2"),
  //   "2",
  // );
  // await utilities.sleep(10);
  // assert.equal(
  //   database.cache("3", () => "3"),
  //   "3",
  // );
  // await utilities.sleep(10);
  // assert.equal(
  //   database.cache("1", () => {
  //     throw new Error();
  //   }),
  //   "1",
  // );
  // await utilities.sleep(10);
  // assert.equal(
  //   database.cache("4", () => "4"),
  //   "4",
  // );
  // await utilities.sleep(10);
  // assert.equal(
  //   database.cache("2", () => "a new 2"),
  //   "a new 2",
  // );

  // database.run(
  //   sql`
  //     delete from "_cache";
  //   `,
  // );
  // assert.equal(await database.cacheAsync("1", () => "1"), "1");
  // await utilities.sleep(10);
  // assert.equal(await database.cacheAsync("2", () => "2"), "2");
  // await utilities.sleep(10);
  // assert.equal(await database.cacheAsync("3", () => "3"), "3");
  // await utilities.sleep(10);
  // assert.equal(
  //   await database.cacheAsync("1", () => {
  //     throw new Error();
  //   }),
  //   "1",
  // );
  // await utilities.sleep(10);
  // assert.equal(await database.cacheAsync("4", () => "4"), "4");
  // await utilities.sleep(10);
  // assert.equal(await database.cacheAsync("2", () => "a new 2"), "a new 2");

  assert.deepEqual(
    sql`
      select "id", "name"
      from "users"
      where
        "name" = ${"Leandro Facchinetti"}
        ${sql`and "age" = ${35}`};
    `,
    {
      source: `
      select "id", "name"
      from "users"
      where
        "name" = ?
        and "age" = ?;
    `,
      parameters: ["Leandro Facchinetti", 35],
    },
  );
});

// test(
//   "backgroundJobWorker()",
//   {
//     skip:
//       process.stdin.isTTY && process.argv[2] === "backgroundJobWorker()"
//         ? false
//         : `Run interactive test with ‘node ./build/index.test.mjs "backgroundJobWorker()"’.`,
//   },
//   async () => {
//     const database = await new Database(":memory:").migrate();

//     database.backgroundJob({ type: "aJobWithNoWorker" });

//     database.run(
//       sql`
//         insert into "_backgroundJobs" (
//           "type",
//           "startAt",
//           "startedAt",
//           "retries",
//           "parameters"
//         )
//         values (
//           ${"aJobWhichWasLeftBehind"},
//           ${new Date(Date.now() - 20 * 60 * 1000).toISOString()},
//           ${new Date(Date.now() - 15 * 60 * 1000).toISOString()},
//           ${0},
//           ${JSON.stringify(null)}
//         );
//       `,
//     );
//     database.backgroundJobWorker({ type: "aJobWhichWasLeftBehind" }, () => {});

//     console.log("backgroundJobWorker(): Press ⌃Z to continue...");
//     await new Promise((resolve) => process.once("SIGTSTP", resolve));

//     database.backgroundJobWorker(
//       {
//         type: "aJobWhichTimesOut",
//         timeout: 1000,
//         retries: 2,
//       },
//       async () => {
//         await timers.setTimeout(5 * 1000);
//       },
//     );
//     database.backgroundJob({
//       type: "aJobWhichTimesOut",
//       parameters: { name: "Leandro" },
//     });

//     console.log("backgroundJobWorker(): Press ⌃Z to continue...");
//     await new Promise((resolve) => process.once("SIGTSTP", resolve));

//     database.backgroundJobWorker(
//       {
//         type: "aJobWhichThrowsAnException",
//         retryIn: 1000,
//         retries: 2,
//       },
//       async () => {
//         throw new Error("AN ERROR");
//       },
//     );
//     database.backgroundJob({
//       type: "aJobWhichThrowsAnException",
//       parameters: { name: "Leandro" },
//     });

//     console.log("backgroundJobWorker(): Press ⌃Z to continue...");
//     await new Promise((resolve) => process.once("SIGTSTP", resolve));

//     node.exit();
//   },
// );

// test(
//   "scheduledBackgroundJobWorker()",
//   {
//     skip:
//       process.stdin.isTTY &&
//       process.argv[2] === "scheduledBackgroundJobWorker()"
//         ? false
//         : `Run interactive test with ‘node ./build/index.test.mjs "scheduledBackgroundJobWorker()"’.`,
//   },
//   async () => {
//     const database = await new Database(":memory:").migrate();

//     database.scheduledBackgroundJobWorker(
//       { type: "test", schedule: "@minutely" },
//       () => {
//         console.log("scheduledBackgroundJobWorker()");
//       },
//     );
//   },
// );
