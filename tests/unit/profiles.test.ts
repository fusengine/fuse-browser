import { afterEach, describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { profileStoragePath } from "../../src/identity/profiles.js";

const KEY = "FUSE_BROWSER_HOME";
const saved = process.env[KEY];
afterEach(() => {
  if (saved === undefined) delete process.env[KEY];
  else process.env[KEY] = saved;
});

describe("profileStoragePath — valid names", () => {
  test("resolves under FUSE_BROWSER_HOME/profiles/<name>.json", () => {
    process.env[KEY] = "/tmp/fuse-home";
    expect(profileStoragePath("github")).toBe(join("/tmp/fuse-home", "profiles", "github.json"));
    expect(profileStoragePath("My_Org-2")).toBe(join("/tmp/fuse-home", "profiles", "My_Org-2.json"));
  });
  test("defaults to ~/.fuse-browser when FUSE_BROWSER_HOME is unset", () => {
    delete process.env[KEY];
    expect(profileStoragePath("a")).toBe(join(homedir(), ".fuse-browser", "profiles", "a.json"));
  });
  test("accepts the 41-char maximum", () => {
    expect(() => profileStoragePath(`a${"b".repeat(40)}`)).not.toThrow();
  });
});

describe("profileStoragePath — invalid names", () => {
  const bad = ["", "-lead", "_lead", "has space", "a/b", "a\\b", "../etc", "dot.name", "x".repeat(42)];
  for (const name of bad) {
    test(`rejects ${JSON.stringify(name)}`, () => {
      expect(() => profileStoragePath(name)).toThrow(/Invalid profile name/);
    });
  }
});
