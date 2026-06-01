/**
 * Replay: before/after screenshots for each action.
 * @module state/replay
 */
import { join } from "node:path";
import type { Page } from "playwright";
import { ensureDir } from "../lib/fs.js";

/** Capture a replay screenshot; returns the path or null if disabled/failed. */
export async function captureReplayScreenshot(
  page: Page,
  dir: string,
  enabled: boolean,
  runId: string,
  index: number,
  phase: "before" | "after",
): Promise<string | null> {
  if (!enabled) return null;
  ensureDir(dir);
  const path = join(dir, `${runId}-${String(index).padStart(2, "0")}-${phase}.png`);
  try {
    await page.screenshot({ path, fullPage: true });
    return path;
  } catch {
    return null;
  }
}
