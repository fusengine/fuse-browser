import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright";
import { runWithMemory } from "../../src/state/action-memory.js";
import type { ActionResult } from "../../src/interfaces/types.js";

const fakePage = { url: () => "https://shop.test/checkout" } as unknown as Page;
const ok = (strategy: string): ActionResult => ({ type: "click", ok: true, strategy });

describe("runWithMemory", () => {
  test("persists the winning strategy then replays it as preferredStrategy", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fuse-mem-"));
    const seen: string[] = [];
    const exec = async (a: Record<string, unknown>): Promise<ActionResult> => {
      seen.push(String(a.preferredStrategy ?? ""));
      return ok("role");
    };
    await runWithMemory(dir, fakePage, { type: "click", target: "Book" }, exec);
    await runWithMemory(dir, fakePage, { type: "click", target: "Book" }, exec);
    expect(seen[0]).toBe(""); // first run: nothing remembered
    expect(seen[1]).toBe("role"); // second run: replays the winner
  });

  test("no-op (just runs) when dir is empty", async () => {
    const r = await runWithMemory("", fakePage, { type: "click", target: "X" }, async () => ok("text"));
    expect(r.ok).toBe(true);
  });
});
