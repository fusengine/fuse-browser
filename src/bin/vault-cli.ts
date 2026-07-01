/**
 * `fuse-browser vault <set|list|rm|test>`: manage the local credential vault.
 * Secrets are read from stdin without echo, NEVER from argv (which would leak
 * via the process list / shell history). This is the only vault write path —
 * the MCP surface is read-only by design.
 * @module bin/vault-cli
 */
import { assertRef, listEntries, loadVault, removeEntry, setEntry } from "../vault/store.js";
import { totp } from "../vault/totp.js";
import { promptHidden, promptLine } from "./prompt-hidden.js";

/** Prompt for and store a credential under `ref` (origin binding mandatory). */
async function setCmd(ref: string): Promise<void> {
  assertRef(ref);
  const username = await promptLine("Username: ");
  const password = await promptHidden("Password: ");
  const totpSecret = await promptHidden("TOTP secret (base32 or otpauth://, empty to skip): ");
  const origins = (await promptLine("Allowed origins (comma-separated, e.g. https://github.com): "))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    throw new Error("At least one origin is required — origin binding is mandatory.");
  }
  setEntry(ref, { username, password, totp: totpSecret || undefined, origins });
  process.stdout.write(`Saved credential "${ref}" (${origins.length} origin(s)).\n`);
}

/** Print non-secret metadata for every stored credential. */
function listCmd(): void {
  const rows = listEntries(loadVault());
  if (rows.length === 0) {
    process.stdout.write("Vault is empty.\n");
    return;
  }
  for (const r of rows) {
    process.stdout.write(`${r.ref}\t${r.username}\ttotp:${r.hasTotp ? "yes" : "no"}\t${r.origins.join(",")}\n`);
  }
}

/** Print the current TOTP code + confirm the password length (no secret echo). */
function testCmd(ref: string): void {
  const entry = loadVault().entries[ref];
  if (!entry) throw new Error(`No credential "${ref}".`);
  const code = entry.totp ? totp(entry.totp) : "(none)";
  process.stdout.write(`ref="${ref}" username="${entry.username}" password=(${entry.password.length} chars) totp=${code}\n`);
}

/** Route a `vault` subcommand. Returns true when handled. */
export async function runVaultCli(rest: string[]): Promise<boolean> {
  const [sub, ref] = rest;
  if (sub === "list") {
    listCmd();
    return true;
  }
  if (sub === "set" && ref) {
    await setCmd(ref);
    return true;
  }
  if (sub === "rm" && ref) {
    process.stdout.write(removeEntry(ref) ? `Removed "${ref}".\n` : `No credential "${ref}".\n`);
    return true;
  }
  if (sub === "test" && ref) {
    testCmd(ref);
    return true;
  }
  process.stderr.write("Usage: fuse-browser vault <set|list|rm|test> [ref]\n");
  return false;
}
