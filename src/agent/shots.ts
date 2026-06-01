/**
 * Capture one page across several viewports, saving a PNG per viewport.
 * Uses `setViewportSize` (CSS-responsive screenshot, not full device emulation).
 * @module agent/shots
 */
import { join } from "node:path";
import { selectEngineForConfig } from "../engine/registry.js";
import { teardownOpened } from "../engine/teardown.js";
import { type ViewportInput, resolveViewport } from "../engine/viewport.js";
import { ensureDir, sha1 } from "../lib/fs.js";
import { gotoWithRetry } from "../net/navigate.js";
import { settleForCapture } from "../state/settle-capture.js";
import type { ResolvedConfig } from "./config.js";

/** One saved responsive screenshot. */
export interface Shot {
  viewport: string;
  width: number;
  height: number;
  path: string;
}

/** Open `url`, screenshot it at each viewport, return the saved file paths. */
export async function captureShots(
  config: ResolvedConfig,
  url: string,
  viewports: ViewportInput[],
  settleMs = 400,
): Promise<Shot[]> {
  ensureDir(config.outputDir);
  const runId = sha1(`${url}-shots`).slice(0, 10);
  const opened = await selectEngineForConfig(config).open(config);
  const page = opened.page ?? (await opened.context.newPage());
  const shots: Shot[] = [];
  try {
    await gotoWithRetry(page, url, { waitUntil: "domcontentloaded", timeout: 30_000 }, config.retry);
    for (const v of viewports) {
      const size = resolveViewport(v);
      await page.setViewportSize(size);
      await settleForCapture(page, settleMs);
      const name = typeof v === "string" ? v : `${size.width}x${size.height}`;
      const path = join(config.outputDir, `${runId}-${name}.png`);
      await page.screenshot({ path, fullPage: true, animations: "disabled" });
      shots.push({ viewport: name, width: size.width, height: size.height, path });
    }
  } finally {
    await teardownOpened(opened);
  }
  return shots;
}
