import test from "node:test";
import assert from "node:assert/strict";
import * as cryptography from "@radically-straightforward/cryptography";

test("SymmetricEncryption", async () => {
  const key = await cryptography.SymmetricEncryption.generateKey();
  const exportedKey = cryptography.SymmetricEncryption.exportKey(key);
  const importedKey = cryptography.SymmetricEncryption.importKey(exportedKey);
  assert.deepStrictEqual(key, importedKey);
  const plainText = "Radically Straightforward";
  const encryptedText = cryptography.SymmetricEncryption.encrypt(
    key,
    plainText,
  );
  const decryptedText = cryptography.SymmetricEncryption.decrypt(
    key,
    encryptedText,
  );
  assert.deepStrictEqual(plainText, decryptedText);
});

test("AsymmetricEncryption", async () => {
  const keyPair = await cryptography.AsymmetricEncryption.generateKeyPair();
  assert(keyPair.privateKey.startsWith("-----BEGIN PRIVATE KEY-----"));
  assert(keyPair.publicKey.startsWith("-----BEGIN PUBLIC KEY-----"));
});

test("TokenHash", async () => {
  const token = "12345678";
  const hash = cryptography.TokenHash.hash(token);
  assert(cryptography.TokenHash.verify(hash, token));
});

test("PasswordHash", async () => {
  const password = "12345678";
  const hash = await cryptography.PasswordHash.hash(password);
  assert(await cryptography.PasswordHash.verify(hash, password));
});
