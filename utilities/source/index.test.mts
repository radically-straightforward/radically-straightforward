import test from "node:test";
import assert from "node:assert/strict";
import * as utilities from "./index.mjs";
import { intern as $ } from "./index.mjs";

test("intern()", () => {
  // @ts-expect-error
  assert(([1] === [1]) === false);
  assert($([1]) === $([1]));
  assert($({ a: 1, b: 2 }) === $({ b: 2, a: 1 }));

  assert($([1]) !== $([2]));

  {
    const map = new Map<number[], number>();
    map.set([1], 1);
    map.set([1], 2);
    assert.equal(map.size, 2);
    assert.equal(map.get([1]), undefined);
  }

  {
    const map = new Map<utilities.Intern<number[]>, number>();
    map.set($([1]), 1);
    map.set($([1]), 2);
    assert.equal(map.size, 1);
    assert.equal(map.get($([1])), 2);
  }

  {
    const set = new Set<number[]>();
    set.add([1]);
    set.add([1]);
    assert.equal(set.size, 2);
    assert(set.has([1]) === false);
  }

  {
    const set = new Set<utilities.Intern<number[]>>();
    set.add($([1]));
    set.add($([1]));
    assert.equal(set.size, 1);
    assert(set.has($([1])));
  }

  assert.throws(() => {
    // @ts-expect-error
    $([1, {}]);
  });
  assert($([1, $({})]) === $([1, $({})]));

  assert.throws(() => {
    // @ts-expect-error
    $([1])[0] = 2;
  });
});

test("randomString()", () => {
  const randomString = utilities.randomString();
  assert(10 <= randomString.length && randomString.length <= 11);
  assert.match(randomString, /^[0-9a-z]+$/);
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
