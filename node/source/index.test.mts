import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import * as node from "./index.mjs";

test("time()", async () => {
  await node.time("Time summing up to of 1_000_000", () => {
    let sum = 0;
    for (let number = 0; number < 1_000_000; number++) sum += number;
  });
});

test("elapsedTime()", () => {
  assert.equal(node.elapsedTime(128020188396416n, 128041549262166n), 21360n);
});

test(
  "eventLoopActive()",
  {
    ...(!process.stdin.isTTY
      ? {
          skip: "node ./build/index.test.mjs",
        }
      : {}),
  },
  async () => {
    console.log("eventLoopActive(): Press ⌃C to continue");
    await node.eventLoopActive();
    console.log("eventLoopActive(): Continuing…");
  },
);

test("isExecuted()", async () => {
  assert(await node.isExecuted(import.meta.url));
  assert(
    !(await node.isExecuted(
      new URL("./index.mjs", import.meta.url).toString(),
    )),
  );
});

test("portAvailable()", async () => {
  const port = 9123;
  assert(await node.portAvailable(port));
  const server = net.createServer();
  await new Promise<void>((resolve) =>
    server.listen(port, () => {
      resolve();
    }),
  );
  assert(!(await node.portAvailable(port)));
  await new Promise<void>((resolve) =>
    server.close(() => {
      resolve();
    }),
  );
  assert(await node.portAvailable(port));
});
