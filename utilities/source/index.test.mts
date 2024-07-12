import test from "node:test";
import assert from "node:assert/strict";
import * as utilities from "@radically-straightforward/utilities";
import { intern as $ } from "@radically-straightforward/utilities";

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

test("dedent()", () => {
  const exampleOfInterpolatedString =
    "example of\n an interpolated string including a newline and indentation";

  assert.equal(
    utilities.dedent`
      Here is an

      ${exampleOfInterpolatedString}

      followed by some more text.
    `,
    "Here is an\n\nexample of\n an interpolated string including a newline and indentation\n\nfollowed by some more text.",
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

test(
  "backgroundJob()",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "backgroundJob()"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "backgroundJob()"’.`,
  },
  async () => {
    const backgroundJob = utilities.backgroundJob(
      { interval: 3 * 1000 },
      async () => {
        console.log("backgroundJob(): Running background job...");
        await utilities.sleep(3 * 1000);
        console.log("backgroundJob(): ...finished running background job.");
        if (Math.random() < 0.3)
          throw new Error(
            "There’s a 30% chance that the background job results in error.",
          );
      },
    );
    process.on("SIGTSTP", () => {
      backgroundJob.run();
    });
    process.on("SIGINT", () => {
      backgroundJob.stop();
    });
    console.log("backgroundJob(): Press ⌃Z to ‘run()’ and ⌃C to ‘stop()’...");
  },
);

test("timeout()", async () => {
  await utilities.timeout(5000, async () => {
    await utilities.sleep(1000);
    console.log("timeout(): Succeeded within the timeout.");
  });
  await assert.rejects(async () => {
    await utilities.timeout(5000, async () => {
      await utilities.sleep(1000);
      throw new Error("timeout(): Failed but didn’t timeout.");
    });
  });
  await assert.rejects(async () => {
    await utilities.timeout(1000, async () => {
      await utilities.sleep(5000);
      console.log("timeout(): Timed out but there isn’t a way to stop it.");
    });
  });
});

test(
  "foregroundJob()",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "foregroundJob()"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "foregroundJob()"’.`,
  },
  async () => {
    const foregroundJob = utilities.foregroundJob(async () => {
      console.log("foregroundJob(): Running foreground job...");
      await utilities.sleep(3 * 1000);
      console.log("foregroundJob(): ...finished running foreground job.");
      if (Math.random() < 0.3)
        throw new Error(
          "There’s a 30% chance that the foreground job results in error.",
        );
    });
    process.on("SIGTSTP", () => {
      foregroundJob();
    });
    console.log("foregroundJob(): Press ⌃Z to run foreground job...");
    setInterval(() => {});
  },
);
