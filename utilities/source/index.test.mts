import test from "node:test";
import assert from "node:assert/strict";
import * as utilities from "./index.mjs";

test("deduplicate()", () => {
  assert(
    utilities.deduplicate({ name: "Leandro", age: 33 }) ===
      utilities.deduplicate({ name: "Leandro", age: 33 }),
  );

  const setWithDuplicates = new Set();
  setWithDuplicates.add({ name: "Leandro", age: 33 });
  setWithDuplicates.add({ name: "Leandro", age: 33 });
  assert.equal(setWithDuplicates.size, 2);

  const setWithoutDuplicates = new Set();
  setWithoutDuplicates.add(utilities.deduplicate({ name: "Leandro", age: 33 }));
  setWithoutDuplicates.add(utilities.deduplicate({ name: "Leandro", age: 33 }));
  assert.equal(setWithoutDuplicates.size, 1);
});

// test(
//   "backgroundJob()",
//   {
//     ...(!process.stdin.isTTY
//       ? {
//           skip: "Run interactive test with ‘node ./build/index.test.mjs’.",
//         }
//       : {}),
//   },
//   async () => {
//     const backgroundJob = node.backgroundJob({ interval: 3 * 1000 }, () => {
//       console.log("backgroundJob(): Running background job...");
//     });
//     process.on("SIGTSTP", () => {
//       backgroundJob.run();
//     });
//     console.log(
//       "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to continue...",
//     );
//     await node.shouldTerminate();
//     backgroundJob.stop();
//   },
// );
