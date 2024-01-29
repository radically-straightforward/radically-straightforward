import test from "node:test";
import assert from "node:assert/strict";
import * as node from "@radically-straightforward/node";
import * as utilities from "./index.mjs";
import { intern as $ } from "./index.mjs";

test(
  "backgroundJob()",
  {
    ...(!process.stdin.isTTY
      ? {
          skip: "Run interactive test with ‘node ./build/index.test.mjs’.",
        }
      : {}),
  },
  async () => {
    const backgroundJob = utilities.backgroundJob(
      { interval: 3 * 1000 },
      async () => {
        console.log("backgroundJob(): Running background job...");
        await utilities.sleep(3 * 1000);
        console.log("backgroundJob(): ...finished running background job.");
      },
    );
    console.log(
      "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to continue...",
    );
    process.on("SIGTSTP", () => {
      backgroundJob.run();
    });
    await node.shouldTerminate();
    backgroundJob.stop();
  },
);

test("sleep()", async () => {
  const before = Date.now();
  await utilities.sleep(1000);
  assert(Date.now() - before >= 1000);
});

test("randomString()", () => {
  const randomString = utilities.randomString();
  assert(10 <= randomString.length && randomString.length <= 11);
  assert.match(randomString, /^[0-9a-z]+$/);
});

test("randomString()", () => {
  utilities.log("EXAMPLE", "OF", "TAB-SEPARATED LOGGING");
});

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

  const iterations = 1000;
  console.time("intern()");
  const objects = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    const entries = [];
    for (let key = 0; key < Math.floor(Math.random() * 15); key++) {
      entries.push([`key${key + Math.floor(Math.random() * 15)}`, 1]);
    }
    objects.push($(Object.fromEntries(entries)));
    objects.push($(entries.flat()));
  }
  console.log($.pool.record.size);
  console.timeEnd("intern()");
});
