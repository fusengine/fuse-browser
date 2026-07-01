/**
 * AES-256-GCM encryption for the credential vault + master-key management.
 * The key comes from `FUSE_VAULT_KEY` (base64, 32 bytes) or a `0600` key file.
 * At-rest encryption protects the blob when it travels without its key
 * (backup, sync, accidental `git add`); it is not a defense against local
 * malware running as the same user.
 * @module vault/crypto
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { VaultBlob } from "../interfaces/vault.js";
import { ensureDir } from "../lib/fs.js";

/** Read a 32-byte master key from `FUSE_VAULT_KEY` (base64) or `keyPath` (0600). */
export function loadKey(keyPath: string): Buffer {
  const env = process.env.FUSE_VAULT_KEY;
  if (env) {
    const key = Buffer.from(env, "base64");
    if (key.length !== 32) {
      throw new Error("FUSE_VAULT_KEY must be base64 of exactly 32 bytes.");
    }
    return key;
  }
  if (existsSync(keyPath)) {
    const key = readFileSync(keyPath);
    if (key.length !== 32) {
      throw new Error(`Vault key at ${keyPath} must be exactly 32 bytes (got ${key.length}).`);
    }
    return key;
  }
  return generateKey(keyPath);
}

/** Create a fresh 32-byte key, persist it `0600`, and return it. */
export function generateKey(keyPath: string): Buffer {
  const key = randomBytes(32);
  ensureDir(dirname(keyPath));
  writeFileSync(keyPath, key, { mode: 0o600 });
  return key;
}

/** Encrypt UTF-8 `plaintext` into a self-describing GCM envelope. */
export function encrypt(plaintext: string, key: Buffer): VaultBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: ct.toString("base64"),
  };
}

/** Decrypt a GCM envelope back to UTF-8; throws if the key or tag mismatch. */
export function decrypt(blob: VaultBlob, key: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(blob.ct, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf-8");
}
