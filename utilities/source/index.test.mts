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
    for (let iteration = 0; iteration < 1000; iteration++) {
      const backgroundJob = utilities.backgroundJob(
        { interval: 3 * 1000 },
        () => {},
      );
      backgroundJob.stop();
      // If background jobs leak ‘process.once("gracefulTermination")’ event listeners, then we get a warning in the console.
    }

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

test("JSONLinesTransformStream", async () => {
  {
    const reader = new Blob([
      `\n\n${JSON.stringify("hi")}\n${JSON.stringify({ hello: "world" })}\n`,
    ])
      .stream()
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new utilities.JSONLinesTransformStream())
      .getReader();
    assert.equal((await reader.read()).value, "hi");
    assert.deepEqual((await reader.read()).value, { hello: "world" });
    assert.equal((await reader.read()).value, undefined);
  }

  {
    const reader = new Blob([`\n\n${JSON.stringify("hi")}\n{\n`])
      .stream()
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new utilities.JSONLinesTransformStream())
      .getReader();
    assert.equal((await reader.read()).value, "hi");
    await assert.rejects(async () => {
      await reader.read();
    });
  }
});

test("capitalize()", () => {
  assert.equal(
    utilities.capitalize("leandro Facchinetti"),
    "Leandro Facchinetti",
  );
});

test("isDate()", () => {
  assert(utilities.isDate("2024-04-01T14:57:46.638Z"));
  assert(!utilities.isDate("2024-04-01T14:57:46.68Z"));
  assert(!utilities.isDate("2024-04-32T14:57:46.638Z"));
});

test("emailRegExp", () => {
  assert.match("leandro@leafac.com", utilities.emailRegExp);
  assert.doesNotMatch("leandro@leafac.c", utilities.emailRegExp);
  assert.doesNotMatch("leandro@localhost", utilities.emailRegExp);
  assert.doesNotMatch("leafac.com", utilities.emailRegExp);
  assert.doesNotMatch("'hello'@leafac.com", utilities.emailRegExp);
  assert.doesNotMatch("leandro@lea_fac.com", utilities.emailRegExp);
});

test("ISODateRegExp", () => {
  assert.match("2024-04-01T14:19:48.162Z", utilities.ISODateRegExp);
  assert.doesNotMatch("2024-04-01 15:20", utilities.ISODateRegExp);
});

test("localizedDateRegExp", () => {
  assert.match("2024-04-01 15:20", utilities.localizedDateRegExp);
  assert.doesNotMatch(
    "2024-04-01T14:19:48.162Z",
    utilities.localizedDateRegExp,
  );
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
