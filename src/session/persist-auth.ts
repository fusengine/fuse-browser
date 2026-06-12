/**
 * Persist a context's full auth state (cookies + localStorage + IndexedDB) to
 * a storage-state JSON. Best-effort: never throws, so it can run on teardown,
 * mid-probe, or right after a login without ever blocking the caller.
 * @module session/persist-auth
 */
import { dirname } from "node:path";
import type { BrowserContext } from "playwright";
import { ensureDir } from "../lib/fs.js";

/**
 * Save the context's storage state to `path`, including IndexedDB.
 *
 * No-op when `path` is falsy. The Playwright `indexedDB: true` flag (≥1.51)
 * captures IndexedDB databases alongside cookies + localStorage, so a reload
 * with the same storage state replays a complete logged-in session.
 *
 * @param context - The live browser context to snapshot.
 * @param path - Destination storage-state JSON path, or falsy to skip.
 */
export async function persistStorageState(
  context: BrowserContext,
  path: string | null | undefined,
): Promise<void> {
  if (!path) return;
  try {
    ensureDir(dirname(path));
    await context.storageState({ path, indexedDB: true });
  } catch {
    /* best-effort: never block teardown / login / probe */
  }
}
