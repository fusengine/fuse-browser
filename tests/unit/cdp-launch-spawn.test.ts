import { describe, expect, test } from "bun:test";
import { spawnBrowser } from "../../src/engine/cdp-launch.js";

// P0-a regression coverage: a bad binary must never crash the process via an
// unhandled child "error" event — it must resolve a structured failure.
describe("spawnBrowser", () => {
  test("a nonexistent binary resolves a structured failure instead of throwing/crashing", async () => {
    const result = await spawnBrowser("/nonexistent/path/to/nothing-fuse-test", 9599);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.toUpperCase()).toContain("ENOENT");
    }
  });

  test("does not reject and does not throw synchronously (never kills the caller)", async () => {
    await expect(spawnBrowser("/nonexistent/path/to/nothing-fuse-test-2", 9598)).resolves.toBeDefined();
  });
});
