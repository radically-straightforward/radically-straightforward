import childProcess from "node:child_process";
import util from "node:util";
import crypto from "node:crypto";
import * as utilities from "@radically-straightforward/utilities";

/**
 * Similar to `process.exit()`, but with the following differences:
 *
 * 1. Emits the `gracefulTermination` event.
 * 2. After a timeout of 10 seconds, if the process hasn’t exited cleanly, forcefully terminate it.
 */
let exiting = false;
export function exit(): void {
  if (exiting) return;
  exiting = true;
  setTimeout(() => {
    process.exit(1);
  }, 10 * 1000).unref();
  process.emit("gracefulTermination" as any);
  process.exit();
}

for (const signal of [
  "SIGINT",
  "SIGQUIT",
  "SIGBREAK",
  "SIGHUP",
  "SIGTERM",
  "SIGUSR2",
])
  process.once(signal, () => {
    exit();
  });

/**
 * This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `setInterval()` which adds support for graceful termination.
 *
 * **Example**
 *
 * ```javascript
 * import timers from "node:timers/promises";
 * import * as node from "@radically-straightforward/node";
 *
 * node.setInterval({ duration: 3 * 1000 }, async () => {
 *   console.log("setInterval(): Running ‘function_’...");
 *   await timers.setTimeout(3 * 1000);
 *   console.log("setInterval(): ...finished running ‘function_’.");
 * });
 * ```
 */
export function setInterval(
  utilitiesSetIntervalOptions: Parameters<typeof utilities.setInterval>[0],
  function_: Parameters<typeof utilities.setInterval>[1],
): ReturnType<typeof utilities.setInterval> {
  const interval = utilities.setInterval(
    {
      ...utilitiesSetIntervalOptions,
      onStop: async () => {
        process.off("gracefulTermination", gracefulTerminationEventListener);
        await utilitiesSetIntervalOptions.onStop?.();
      },
    },
    function_,
  );
  const gracefulTerminationEventListener = () => {
    interval.stop();
  };
  process.once("gracefulTermination", gracefulTerminationEventListener);
  return interval;
}
process.setMaxListeners(50);

/**
 * Keep a child process alive. If the child process crashes, respawn it. When the process gracefully terminates, gracefully terminate the child process as well.
 *
 * **Example**
 *
 * ```typescript
 * node.childProcessKeepAlive(() =>
 *   childProcess.spawn("node", ["--eval", `http.createServer().listen(18000)`], {
 *     stdio: "inherit",
 *   }),
 * );
 * ```
 */
export function childProcessKeepAlive(
  newChildProcess: () =>
    | ReturnType<(typeof childProcess)["spawn"]>
    | Promise<ReturnType<(typeof childProcess)["spawn"]>>,
): void {
  let childProcessInstance: ReturnType<(typeof childProcess)["spawn"]>;
  setInterval(
    {
      duration: 200,
      onStop: () => {
        childProcessInstance.kill();
      },
    },
    async () => {
      childProcessInstance = await newChildProcess();
      await new Promise((resolve) => {
        childProcessInstance.once("close", resolve);
      });
    },
  );
}

/**
 * Utilities for cryptography that make it secure and easy to use.
 */
export class SymmetricEncryption {
  /***/
  static async generateKey(): Promise<crypto.KeyObject> {
    return await util.promisify(crypto.generateKey)("aes", { length: 256 });
  }

  /***/
  static exportKey(key: crypto.KeyObject): string {
    return key.export().toString("hex");
  }

  /***/
  static importKey(keyString: string): crypto.KeyObject {
    return crypto.createSecretKey(keyString, "hex");
  }

  /***/
  static encrypt(key: crypto.KeyObject, plainText: string): string {
    const initializationVector = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      key,
      initializationVector,
    );
    const cipherText = Buffer.concat([
      cipher.update(plainText),
      cipher.final(),
    ]);
    const authenticationTag = cipher.getAuthTag();
    return JSON.stringify({
      initializationVector: initializationVector.toString("hex"),
      cipherText: cipherText.toString("base64"),
      authenticationTag: authenticationTag.toString("hex"),
    });
  }

  /***/
  static decrypt(key: crypto.KeyObject, encryptedText: string): string {
    const encryptedTextParts = JSON.parse(encryptedText);
    const initializationVector = Buffer.from(
      encryptedTextParts.initializationVector,
      "hex",
    );
    const cipherText = Buffer.from(encryptedTextParts.cipherText, "base64");
    const authenticationTag = Buffer.from(
      encryptedTextParts.authenticationTag,
      "hex",
    );
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      initializationVector,
    );
    decipher.setAuthTag(authenticationTag);
    return Buffer.concat([
      decipher.update(cipherText),
      decipher.final(),
    ]).toString("utf-8");
  }
}

/***/
export class AsymmetricEncryption {
  /***/
  static async generateKeyPair(): Promise<{
    privateKey: string;
    publicKey: string;
  }> {
    return await util.promisify(crypto.generateKeyPair)("rsa", {
      modulusLength: 3072,
      publicKeyEncoding: { format: "pem", type: "spki" },
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
    });
  }
}

/***/
export class TokenHash {
  /***/
  static hash(token: string): string {
    return crypto.hash("sha256", token);
  }

  /***/
  static verify(hash: string, token: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      crypto.hash("sha256", token, "buffer"),
    );
  }
}

/***/
export class PasswordHash {
  static #argon2Options = {
    tagLength: 32,
    parallelism: 1,
    memory: 12288,
    passes: 3,
  };

  /***/
  static async hash(password: string): Promise<string> {
    const nonce = crypto.randomBytes(16);
    const hash = await util.promisify(crypto.argon2)("argon2id", {
      message: password,
      nonce,
      ...this.#argon2Options,
    });
    return JSON.stringify({
      nonce: nonce.toString("hex"),
      hash: hash.toString("hex"),
    });
  }

  /***/
  static async verify(
    hashedPassword: string,
    password: string,
  ): Promise<boolean> {
    const hashedPasswordParts = JSON.parse(hashedPassword);
    const nonce = Buffer.from(hashedPasswordParts.nonce, "hex");
    const hash = Buffer.from(hashedPasswordParts.hash, "hex");
    return crypto.timingSafeEqual(
      hash,
      await util.promisify(crypto.argon2)("argon2id", {
        message: password,
        nonce,
        ...this.#argon2Options,
      }),
    );
  }
}
