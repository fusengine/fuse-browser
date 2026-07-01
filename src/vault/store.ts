/**
 * Encrypted credential store: resolve vault paths, load/save the blob
 * atomically, and CRUD entries. Writes are temp+rename in the SAME dir
 * (guaranteed same filesystem → atomic, no EXDEV).
 * @module vault/store
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VaultBlob, VaultData, VaultEntry, VaultMeta } from "../interfaces/vault.js";
import { ensureDir } from "../lib/fs.js";
import { fuseBrowserHome } from "../lib/home.js";
import { decrypt, encrypt, loadKey } from "./crypto.js";

/** Allowed credential refs: alnum start, then alnum/`-`/`_`, 1-41 chars. */
const REF_NAME = /^[a-z0-9][a-z0-9_-]{0,40}$/i;

/** Absolute path of the encrypted vault file. */
export function vaultPath(): string {
  return join(fuseBrowserHome(), "vault.json");
}

/** Absolute path of the master-key file. */
export function vaultKeyPath(): string {
  return join(fuseBrowserHome(), "vault.key");
}

/** Validate a credential reference alias, or throw. */
export function assertRef(ref: string): void {
  if (!REF_NAME.test(ref)) {
    throw new Error(
      `Invalid credential ref "${ref}" — use 1-41 chars: letters/digits, then "-" or "_".`,
    );
  }
}

/** Load and decrypt the vault; returns an empty vault when the file is absent. */
export function loadVault(): VaultData {
  const path = vaultPath();
  if (!existsSync(path)) return { entries: {} };
  const keyPath = vaultKeyPath();
  if (!process.env.FUSE_VAULT_KEY && !existsSync(keyPath)) {
    throw new Error(
      `${path} exists but its master key is missing — set FUSE_VAULT_KEY or restore ${keyPath}; the vault cannot be decrypted without the original key.`,
    );
  }
  const key = loadKey(keyPath);
  try {
    const blob = JSON.parse(readFileSync(path, "utf-8")) as VaultBlob;
    return JSON.parse(decrypt(blob, key)) as VaultData;
  } catch (cause) {
    throw new Error(
      `Failed to read ${path} — wrong key (check FUSE_VAULT_KEY / ${keyPath}) or corrupted vault file.`,
      { cause },
    );
  }
}

/** Encrypt and atomically persist the vault (temp + rename, mode 0600). */
export function saveVault(data: VaultData): void {
  const path = vaultPath();
  ensureDir(fuseBrowserHome());
  const key = loadKey(vaultKeyPath());
  const blob = encrypt(JSON.stringify(data), key);
  const tmp = `${path}.tmp-${randomBytes(4).toString("hex")}`;
  writeFileSync(tmp, JSON.stringify(blob), { mode: 0o600 });
  renameSync(tmp, path);
}

/** Upsert a credential entry under `ref`. */
export function setEntry(ref: string, entry: VaultEntry): void {
  assertRef(ref);
  const data = loadVault();
  data.entries[ref] = entry;
  saveVault(data);
}

/** Remove a credential entry; returns true when it existed. */
export function removeEntry(ref: string): boolean {
  const data = loadVault();
  if (!(ref in data.entries)) return false;
  delete data.entries[ref];
  saveVault(data);
  return true;
}

/** Non-secret metadata for every entry — never returns a secret. */
export function listEntries(data: VaultData): VaultMeta[] {
  return Object.entries(data.entries).map(([ref, e]) => ({
    ref,
    username: e.username,
    hasTotp: Boolean(e.totp),
    origins: e.origins,
  }));
}
