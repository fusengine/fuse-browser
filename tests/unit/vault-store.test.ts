import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listEntries, loadVault, removeEntry, setEntry } from "../../src/vault/store.js";

const prevHome = process.env.FUSE_BROWSER_HOME;
let dir = "";

const ENTRY = {
  username: "u",
  password: "p@ss-w0rd",
  totp: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  origins: ["https://github.com"],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "fuse-vault-"));
  process.env.FUSE_BROWSER_HOME = dir;
  process.env.FUSE_VAULT_KEY = Buffer.alloc(32, 7).toString("base64");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (prevHome === undefined) delete process.env.FUSE_BROWSER_HOME;
  else process.env.FUSE_BROWSER_HOME = prevHome;
  delete process.env.FUSE_VAULT_KEY;
});

describe("vault store", () => {
  test("an absent vault loads as empty", () => {
    expect(loadVault().entries).toEqual({});
  });

  test("set → load round-trips through the encrypted file", () => {
    setEntry("gh", ENTRY);
    expect(loadVault().entries.gh).toEqual(ENTRY);
  });

  test("list returns metadata only — never a secret", () => {
    setEntry("gh", ENTRY);
    const [row] = listEntries(loadVault());
    expect(row).toEqual({ ref: "gh", username: "u", hasTotp: true, origins: ["https://github.com"] });
    expect(JSON.stringify(row)).not.toContain("p@ss-w0rd");
  });

  test("remove deletes the entry", () => {
    setEntry("gh", ENTRY);
    expect(removeEntry("gh")).toBe(true);
    expect(loadVault().entries.gh).toBeUndefined();
    expect(removeEntry("gh")).toBe(false);
  });

  test("an invalid ref is rejected", () => {
    expect(() => setEntry("bad ref!", ENTRY)).toThrow(/Invalid credential ref/);
  });
});
