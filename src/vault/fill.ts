/**
 * Resolve vault credentials into a live-session action, server-side. The
 * secret never enters the MCP arguments — only a `credentialRef` does — and
 * resolved secrets are recorded for snapshot redaction.
 * @module vault/fill
 */
import type { ActionInput } from "../actions/perform.js";
import type { VaultField } from "../interfaces/vault.js";
import { resolveCredential } from "./resolve.js";
import { loadVault } from "./store.js";

/** Field filled when `browser_fill` gets a ref without an explicit `field`. */
const DEFAULT_FIELD: VaultField = "password";

/**
 * If `args` carries a `credentialRef`, resolve it and patch `action` in place
 * with the real values. No-op when no ref is present.
 *
 * @param args - Raw MCP tool arguments.
 * @param action - The built action to patch.
 * @param currentUrl - Live page URL, used for origin binding.
 * @param secrets - Session taint-set; live secrets are added here.
 * @throws When the ref is unknown, the origin is refused, or TOTP is missing.
 */
export function applyCredential(
  args: Record<string, unknown>,
  action: ActionInput,
  currentUrl: string,
  secrets: Set<string>,
): void {
  const ref = args.credentialRef;
  if (typeof ref !== "string" || !ref) return;
  const data = loadVault();
  if (action.type === "login") {
    action.username = resolveCredential(data, ref, "username", currentUrl).value;
    const pw = resolveCredential(data, ref, "password", currentUrl);
    action.password = pw.value;
    secrets.add(pw.value);
    return;
  }
  const field = (args.field as VaultField) ?? DEFAULT_FIELD;
  const resolved = resolveCredential(data, ref, field, currentUrl);
  action.value = resolved.value;
  if (resolved.secret) secrets.add(resolved.value);
}
