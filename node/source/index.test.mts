import test from "node:test";
import http from "node:http";
import * as node from "./index.mjs";

test(
  "shouldTerminate()",
  {
    ...(!process.stdin.isTTY
      ? {
          skip: "Run interactive test with ‘node ./build/index.test.mjs’.",
        }
      : {}),
  },
  async () => {
    const server = http.createServer();
    server.listen(8000);
    console.log("shouldTerminate(): Press ⌃C to continue...");
    await node.shouldTerminate();
    console.log("shouldTerminate(): ...continuing");
    // Comment the following line and the tests should hang and forcefully terminate after 10 seconds.
    server.close();
  },
);
