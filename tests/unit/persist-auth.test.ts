import { describe, expect, test } from "bun:test";
import type { BrowserContext } from "playwright";
import { persistStorageState } from "../../src/session/persist-auth.js";

/** Minimal BrowserContext stand-in recording storageState() calls. */
function fakeContext(opts?: { reject?: boolean }): {
  ctx: BrowserContext;
  calls: Array<Record<string, unknown>>;
} {
  const calls: Array<Record<string, unknown>> = [];
  const ctx = {
    storageState: async (args?: Record<string, unknown>) => {
      calls.push(args ?? {});
      if (opts?.reject) throw new Error("save failed");
      return {};
    },
  } as unknown as BrowserContext;
  return { ctx, calls };
}

describe("persistStorageState", () => {
  test("saves with { path, indexedDB: true }", async () => {
    const { ctx, calls } = fakeContext();
    await persistStorageState(ctx, "/tmp/fuse-persist-auth.json");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ path: "/tmp/fuse-persist-auth.json", indexedDB: true });
  });

  test("no-op when path is undefined", async () => {
    const { ctx, calls } = fakeContext();
    await persistStorageState(ctx, undefined);
    expect(calls).toHaveLength(0);
  });

  test("no-op when path is null", async () => {
    const { ctx, calls } = fakeContext();
    await persistStorageState(ctx, null);
    expect(calls).toHaveLength(0);
  });

  test("never throws when storageState rejects", async () => {
    const { ctx } = fakeContext({ reject: true });
    await expect(persistStorageState(ctx, "/tmp/fuse-persist-auth.json")).resolves.toBeUndefined();
  });
});
