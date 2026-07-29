import util from "node:util";
import crypto from "node:crypto";

/***/
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
