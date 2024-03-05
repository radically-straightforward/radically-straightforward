import test from "node:test";
import assert from "node:assert/strict";
import * as utilities from "@radically-straightforward/utilities";
import { intern as $ } from "@radically-straightforward/utilities";

test(
  "backgroundJob()",
  {
    skip: process.stdin.isTTY
      ? false
      : "Run interactive test with ‘node ./build/index.test.mjs’.",
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
    process.on("SIGTSTP", () => {
      backgroundJob.run();
    });
    console.log(
      "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to gracefully terminate...",
    );
  },
);

test("sleep()", async () => {
  const before = Date.now();
  await utilities.sleep(1000);
  assert(Date.now() - before >= 1000);
});

test("randomString()", () => {
  assert.match(utilities.randomString(), /^[a-z0-9]+$/);
});

test("log()", () => {
  utilities.log("EXAMPLE", "OF", "TAB-SEPARATED LOGGING");
});

test("intern() Garbage Collection", async () => {
  const getPoolSize = () => {
    const openList = [$._pool.tuples, $._pool.records];
    let size = 0;
    while (openList.length) {
      const node = openList.pop();
      size++;
      for (const innerValueMap of node?.children?.values() || []) {
        for (const x of innerValueMap?.values()) {
          openList.push(x);
        }
      }
    }
    return size;
  };

  // 2 root nodes for records and tuples
  const initialPoolSize = 2;
  assert.equal(getPoolSize(), initialPoolSize);
  {
    $([1]);
    assert.equal(getPoolSize(), initialPoolSize + 1);
  }

  // NOTE: You can test real garbage collection at this moment by adding the
  // `--inspect` param to the node process manually calling "Collect Garbage"
  // in the memory tab of chrome. `--expose-gc` + `global.gc()` is not enough
  // to trigger the finalization registry for the intern cache.
  // This sleep is to give you enough time to find that button and press it!
  // await new Promise((r) => void setTimeout(r, 5000));
  // console.log('Pool size now', getPoolSize())

  // Simulate garbage collection
  const node = $._pool.tuples.children?.get(0)?.get(1);
  assert(!!node?.internedObject?.deref());
  node!.internedObject = { deref: () => undefined } as any;
  $._finalizationRegistryCallback(node!);
  assert.equal(getPoolSize(), initialPoolSize);
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
    const map = new Map<utilities.Interned<number[]>, number>();
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
    const set = new Set<utilities.Interned<number[]>>();
    set.add($([1]));
    set.add($([1]));
    assert.equal(set.size, 1);
    assert(set.has($([1])));
  }

  {
    assert.throws(() => {
      // @ts-expect-error
      $([1, {}]);
    });
    assert($([1, $({})]) === $([1, $({})]));
  }

  assert.throws(() => {
    // @ts-expect-error
    $([1])[0] = 2;
  });

  // If these tests start failing, that's a good thing, delete them and update the README
  assert(Object.is($([+0])[0], $([-0])[0]));

  {
    const iterations = 1000;
    console.time("intern()");
    const objects = [];
    for (let iteration = 0; iteration < iterations; iteration++) {
      const entries = [];
      for (let key = 0; key < Math.floor(Math.random() * 15); key++) {
        entries.push([String(key + Math.floor(Math.random() * 15)), true]);
      }
      objects.push($(Object.fromEntries(entries)));
      objects.push($(entries.flat()));
    }
    // console.log($.pool.record.size);
    console.timeEnd("intern()");
  }
});
