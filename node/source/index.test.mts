import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import timers from "node:timers/promises";
import childProcess from "node:child_process";
import * as node from "@radically-straightforward/node";

test(
  "exit()",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "exit()"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "exit()"’.`,
  },
  async () => {
    const server = http
      .createServer((request, response) => {
        response.end("gracefulTermination");
      })
      .listen(8000);
    process.once("gracefulTermination", () => {
      // If you comment the line below the application remains running for 10 seconds and then it is forcefully terminated.
      server.close();
    });
    console.log("gracefulTermination: Press ⌃C to gracefully terminate...");
    process.once("gracefulTermination", () => {
      console.log("gracefulTermination: Starting graceful termination...");
    });
    process.once("beforeExit", () => {
      console.log("gracefulTermination: Succeeded.");
    });
  },
);

test(
  "setInterval()",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "setInterval()"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "setInterval()"’.`,
  },
  async () => {
    for (let iteration = 0; iteration < 1000; iteration++) {
      const interval = node.setInterval({ duration: 3 * 1000 }, () => {});
      interval.stop();
      // If background jobs leak ‘process.once("gracefulTermination")’ event listeners, then we get a warning in the console.
    }

    const interval = node.setInterval({ duration: 3 * 1000 }, async () => {
      console.log("setInterval(): Running ‘function_’...");
      await timers.setTimeout(3 * 1000);
      console.log("setInterval(): ...finished running ‘function_’.");
    });
    process.on("SIGTSTP", () => {
      interval.run();
    });
    console.log(
      "setInterval(): Press ⌃Z to ‘interval.run()’ and ⌃C to ‘interval.stop()’...",
    );
  },
);

test(
  "childProcessKeepAlive()",
  {
    skip:
      process.stdin.isTTY && process.argv[2] === "childProcessKeepAlive()"
        ? false
        : `Run interactive test with ‘node ./build/index.test.mjs "childProcessKeepAlive()"’.`,
  },
  async () => {
    node.childProcessKeepAlive(() => {
      const childProcessInstance = childProcess.spawn(
        "node",
        ["--eval", `http.createServer().listen(18000)`],
        { stdio: "inherit" },
      );
      console.log(
        `childProcessKeepAlive(): Child process id: ${childProcessInstance.pid}`,
      );
      return childProcessInstance;
    });
  },
);

test("SymmetricEncryption", async () => {
  const key = await node.SymmetricEncryption.generateKey();
  const exportedKey = node.SymmetricEncryption.exportKey(key);
  const importedKey = node.SymmetricEncryption.importKey(exportedKey);
  assert.deepStrictEqual(key, importedKey);
  const plainText = "Radically Straightforward";
  const encryptedText = node.SymmetricEncryption.encrypt(key, plainText);
  const decryptedText = node.SymmetricEncryption.decrypt(key, encryptedText);
  assert.deepStrictEqual(plainText, decryptedText);
});

test("AsymmetricEncryption", async () => {
  const keyPair = await node.AsymmetricEncryption.generateKeyPair();
  assert(keyPair.privateKey.startsWith("-----BEGIN PRIVATE KEY-----"));
  assert(keyPair.publicKey.startsWith("-----BEGIN PUBLIC KEY-----"));
});

test("TokenHash", async () => {
  const token = "12345678";
  const hash = node.TokenHash.hash(token);
  assert(node.TokenHash.verify(hash, token));
});

test("PasswordHash", async () => {
  const password = "12345678";
  const hash = await node.PasswordHash.hash(password);
  assert(await node.PasswordHash.verify(hash, password));
});
