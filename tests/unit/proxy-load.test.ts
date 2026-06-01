import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadProxyList } from "../../src/proxy/load.js";

describe("loadProxyList", () => {
  test("parses FUSE_PROXIES (comma/newline) and dedupes", () => {
    const env = { FUSE_PROXIES: "http://a, http://b\nhttp://a" } as NodeJS.ProcessEnv;
    expect(loadProxyList(env)).toEqual(["http://a", "http://b"]);
  });

  test("merges a JSON file with env, deduped", () => {
    const dir = mkdtempSync(join(tmpdir(), "fb-px-"));
    const file = join(dir, "proxies.json");
    writeFileSync(file, JSON.stringify(["http://c", "http://a"]));
    try {
      const env = { FUSE_PROXIES: "http://a" } as NodeJS.ProcessEnv;
      expect(loadProxyList(env, file)).toEqual(["http://a", "http://c"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("empty when nothing is configured", () => {
    expect(loadProxyList({} as NodeJS.ProcessEnv)).toEqual([]);
  });
});
