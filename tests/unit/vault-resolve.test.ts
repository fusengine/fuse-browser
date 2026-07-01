import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VaultData } from "../../src/interfaces/vault.js";
import { applyCredential } from "../../src/vault/fill.js";
import { resolveCredential } from "../../src/vault/resolve.js";
import { setEntry } from "../../src/vault/store.js";

const ENTRY = {
  username: "u",
  password: "p@ss",
  totp: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  origins: ["https://github.com"],
};
const DATA: VaultData = { entries: { gh: ENTRY } };

afterEach(() => {
  delete process.env.FUSE_VAULT_ALLOW_ANY_ORIGIN;
});

describe("resolve + origin binding", () => {
  test("a matching origin resolves the value", () => {
    expect(resolveCredential(DATA, "gh", "password", "https://github.com/login").value).toBe("p@ss");
  });

  test("a mismatched origin is refused (anti-phishing)", () => {
    expect(() => resolveCredential(DATA, "gh", "password", "https://github.com.attacker.com")).toThrow(/refused/);
    expect(() => resolveCredential(DATA, "gh", "password", "https://evil.github.com")).toThrow(/refused/);
  });

  test("an unknown ref throws a helpful message", () => {
    expect(() => resolveCredential(DATA, "nope", "password", "https://github.com")).toThrow(/vault set/);
  });

  test("FUSE_VAULT_ALLOW_ANY_ORIGIN bypasses binding", () => {
    process.env.FUSE_VAULT_ALLOW_ANY_ORIGIN = "1";
    expect(resolveCredential(DATA, "gh", "username", "https://anywhere.example").value).toBe("u");
  });

  test("the totp field generates a live 6-digit code", () => {
    expect(resolveCredential(DATA, "gh", "totp", "https://github.com").value).toMatch(/^\d{6}$/);
  });
});

describe("applyCredential (fill wiring)", () => {
  const prevHome = process.env.FUSE_BROWSER_HOME;
  afterEach(() => {
    if (prevHome === undefined) delete process.env.FUSE_BROWSER_HOME;
    else process.env.FUSE_BROWSER_HOME = prevHome;
    delete process.env.FUSE_VAULT_KEY;
  });

  test("patches a login action and taints the password", () => {
    const dir = mkdtempSync(join(tmpdir(), "fuse-fill-"));
    process.env.FUSE_BROWSER_HOME = dir;
    process.env.FUSE_VAULT_KEY = Buffer.alloc(32, 3).toString("base64");
    setEntry("gh", ENTRY);
    const secrets = new Set<string>();
    const action: Record<string, unknown> & { type: string } = { type: "login" };
    applyCredential({ credentialRef: "gh" }, action, "https://github.com", secrets);
    expect(action.username).toBe("u");
    expect(action.password).toBe("p@ss");
    expect(secrets.has("p@ss")).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  test("no-op without a credentialRef", () => {
    const secrets = new Set<string>();
    const action: Record<string, unknown> & { type: string } = { type: "fill", value: "x" };
    applyCredential({}, action, "https://x.example", secrets);
    expect(action.value).toBe("x");
    expect(secrets.size).toBe(0);
  });
});
