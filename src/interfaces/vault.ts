/**
 * Vault domain types: encrypted credential store + fill-by-reference.
 * Secrets never cross the MCP boundary — the LLM only ever sees a `ref`.
 * @module interfaces/vault
 */

/** Which field of a stored credential to resolve/fill. */
export type VaultField = "username" | "password" | "totp";

/** A single stored credential. Persisted only inside the encrypted blob. */
export interface VaultEntry {
  /** Login/email/handle typed into the username field. */
  username: string;
  /** Secret typed into the password field. */
  password: string;
  /** Optional TOTP source: an `otpauth://` URI or a raw base32 secret. */
  totp?: string;
  /** Allowlist of `scheme://host` origins this credential may be filled on. */
  origins: string[];
}

/** Decrypted vault contents (in memory only, never written in clear). */
export interface VaultData {
  /** Credentials keyed by their free-form reference alias. */
  entries: Record<string, VaultEntry>;
}

/** On-disk encrypted envelope (`vault.json`). No secret is recoverable without the key. */
export interface VaultBlob {
  /** Schema version. */
  v: 1;
  /** Cipher identifier, always `aes-256-gcm`. */
  alg: "aes-256-gcm";
  /** Base64 12-byte random IV, fresh on every write. */
  iv: string;
  /** Base64 16-byte GCM authentication tag. */
  tag: string;
  /** Base64 ciphertext of the JSON-encoded `VaultData`. */
  ct: string;
}

/** Non-secret metadata returned by `browser_vault { action: "list" }`. */
export interface VaultMeta {
  /** Credential reference alias. */
  ref: string;
  /** Username (not a secret — surfaced to help the agent pick a ref). */
  username: string;
  /** Whether a TOTP secret is stored (the secret itself is never returned). */
  hasTotp: boolean;
  /** Origins this credential is bound to. */
  origins: string[];
}

/** Outcome of resolving a credential field for a fill. */
export interface ResolveResult {
  /** Resolved value to type into the field (real secret, server-side only). */
  value: string;
  /** True when the value is a live secret (password/totp) → taint it in snapshots. */
  secret: boolean;
  /** Stable placeholder surfaced in action reports instead of the value. */
  placeholder: string;
}
