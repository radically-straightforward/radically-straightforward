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

### `SymmetricEncryption`

```typescript
export class SymmetricEncryption;
```

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
