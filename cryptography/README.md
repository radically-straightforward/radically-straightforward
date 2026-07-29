# Radically Straightforward · Cryptography

**🔐 Secure and easy to use cryptographic utilities**

## Installation

```console
$ npm install @radically-straightforward/cryptography
```

## Usage

```typescript
import * as cryptography from "@radically-straightforward/cryptography";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `exit()`

```typescript
export function exit(): void;
```

`exit()` emits the `"gracefulTermination"` event. Upon this event, the application must finish operations that are in progress (for example, finish answering to HTTP requests) and empty the event loop by closing HTTP servers, clearing timeouts, and so forth. If the application is still running 10 seconds after `exit()` is called, then it’s terminated forcefully with `process.exit(1)`.

### `setInterval()`

```typescript
export function setInterval(
  utilitiesSetIntervalOptions: Parameters<typeof utilities.setInterval>[0],
  function_: Parameters<typeof utilities.setInterval>[1],
): ReturnType<typeof utilities.setInterval>;
```

This is an extension of [`@radically-straightforward/utilities`](https://github.com/radically-straightforward/radically-straightforward/tree/main/utilities)’s `setInterval()` which adds support for graceful termination.

**Example**

```javascript
import timers from "node:timers/promises";
import * as node from "@radically-straightforward/node";

node.setInterval({ duration: 3 * 1000 }, async () => {
  console.log("setInterval(): Running ‘function_’...");
  await timers.setTimeout(3 * 1000);
  console.log("setInterval(): ...finished running ‘function_’.");
});
```

### `childProcessKeepAlive()`

```typescript
export function childProcessKeepAlive(
  newChildProcess: () =>
    | ReturnType<(typeof childProcess)["spawn"]>
    | Promise<ReturnType<(typeof childProcess)["spawn"]>>,
): void;
```

Keep a child process alive. If the child process crashes, respawn it. When the process gracefully terminates, gracefully terminate the child process as well.

**Example**

```typescript
node.childProcessKeepAlive(() =>
  childProcess.spawn("node", ["--eval", `http.createServer().listen(18000)`], {
    stdio: "inherit",
  }),
);
```

### `SymmetricEncryption`

```typescript
export class SymmetricEncryption;
```

Utilities for cryptography that make it secure and easy to use.

#### `SymmetricEncryption.generateKey()`

```typescript
static async generateKey(): Promise<crypto.KeyObject>;
```

#### `SymmetricEncryption.exportKey()`

```typescript
static exportKey(key: crypto.KeyObject): string;
```

#### `SymmetricEncryption.importKey()`

```typescript
static importKey(keyString: string): crypto.KeyObject;
```

#### `SymmetricEncryption.encrypt()`

```typescript
static encrypt(key: crypto.KeyObject, plainText: string): string;
```

#### `SymmetricEncryption.decrypt()`

```typescript
static decrypt(key: crypto.KeyObject, encryptedText: string): string;
```

### `AsymmetricEncryption`

```typescript
export class AsymmetricEncryption;
```

#### `AsymmetricEncryption.generateKeyPair()`

```typescript
static async generateKeyPair(): Promise<{
    privateKey: string;
    publicKey: string;
  }>;
```

### `TokenHash`

```typescript
export class TokenHash;
```

#### `TokenHash.hash()`

```typescript
static hash(token: string): string;
```

#### `TokenHash.verify()`

```typescript
static verify(hash: string, token: string): boolean;
```

### `PasswordHash`

```typescript
export class PasswordHash;
```

#### `PasswordHash.hash()`

```typescript
static async hash(password: string): Promise<string>;
```

#### `PasswordHash.verify()`

```typescript
static async verify(
    hashedPassword: string,
    password: string,
  ): Promise<boolean>;
```

<!-- DOCUMENTATION END: ./source/index.mts -->
