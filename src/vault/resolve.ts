/**
 * Resolve a credential field for a fill, enforcing origin binding. The
 * resolved value is a real secret returned server-side only; the LLM sees
 * the placeholder, never the value. Origin binding is the defense against a
 * prompt-injected login on a phishing page.
 * @module vault/resolve
 */
import type { ResolveResult, VaultData, VaultField } from "../interfaces/vault.js";
import { totp } from "./totp.js";

/** Best-effort host of a URL (lowercased), or "" when unparseable. */
function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

/** True when `currentUrl`'s host matches one of the allowed origins. */
export function originAllowed(origins: string[], currentUrl: string): boolean {
  if (process.env.FUSE_VAULT_ALLOW_ANY_ORIGIN === "1") return true;
  const host = hostOf(currentUrl);
  if (!host) return false;
  return origins.some((o) => {
    const oHost = hostOf(o);
    return (oHost || o.toLowerCase()) === host;
  });
}

/**
 * Resolve `field` of credential `ref` for the page at `currentUrl`.
 *
 * @param data - Decrypted vault.
 * @param ref - Credential reference alias.
 * @param field - Which field to resolve (username/password/totp).
 * @param currentUrl - URL of the live page (for origin binding).
 * @returns The resolved value plus its secret flag and placeholder.
 * @throws When the ref is unknown, the origin is refused, or TOTP is missing.
 */
export function resolveCredential(
  data: VaultData,
  ref: string,
  field: VaultField,
  currentUrl: string,
): ResolveResult {
  const entry = data.entries[ref];
  if (!entry) {
    throw new Error(`credential "${ref}" not found — run: fuse-browser vault set ${ref}`);
  }
  if (!originAllowed(entry.origins, currentUrl)) {
    throw new Error(
      `credential "${ref}" is bound to [${entry.origins.join(", ")}] — origin ${hostOf(currentUrl) || currentUrl} refused.`,
    );
  }
  const placeholder = `{{cred:${ref}:${field}}}`;
  if (field === "username") return { value: entry.username, secret: false, placeholder };
  if (field === "password") return { value: entry.password, secret: true, placeholder };
  if (!entry.totp) throw new Error(`credential "${ref}" has no TOTP secret stored.`);
  return { value: totp(entry.totp), secret: true, placeholder };
}
