/**
 * Capture one page across several viewports, saving a PNG per viewport.
 * Uses `setViewportSize` (CSS-responsive screenshot, not full device emulation).
 * @module agent/shots
 */
import { join } from "node:path";
import type { Page } from "playwright";
import { selectEngineForConfig } from "../engine/registry.js";
import { teardownOpened } from "../engine/teardown.js";
import { type ViewportInput, resolveViewport } from "../engine/viewport.js";
import { ensureDir, sha1 } from "../lib/fs.js";
import { gotoWithRetry } from "../net/navigate.js";
import { detectScrollJack, settleForCapture } from "../state/settle-capture.js";
import type { ResolvedConfig } from "./config.js";

/** One saved responsive screenshot. */
export interface Shot {
  viewport: string;
  width: number;
  height: number;
  path: string;
  /** True when the page is scroll-jacked (~one viewport tall): the shot is hero-only, not the full site. */
  scrollJacked?: boolean;
}

/**
 * Navigate `page` to `url` and screenshot it at each viewport — the page-level
 * work, with no browser lifecycle (so a pool can drive it). Saves a PNG per
 * viewport and returns the file paths.
 */
export async function shotsOnPage(
  page: Page,
  config: ResolvedConfig,
  url: string,
  viewports: ViewportInput[],
  settleMs = 400,
): Promise<Shot[]> {
  ensureDir(config.outputDir);
  const runId = sha1(`${url}-shots`).slice(0, 10);
  const shots: Shot[] = [];
  await gotoWithRetry(page, url, { waitUntil: "domcontentloaded", timeout: 30_000 }, config.retry);
  for (const v of viewports) {
    const size = resolveViewport(v);
    await page.setViewportSize(size);
    await settleForCapture(page, settleMs);
    const scrollJacked = await detectScrollJack(page);
    const name = typeof v === "string" ? v : `${size.width}x${size.height}`;
    const path = join(config.outputDir, `${runId}-${name}.png`);
    await page.screenshot({ path, fullPage: true, animations: "disabled" });
    shots.push({ viewport: name, width: size.width, height: size.height, path, scrollJacked });
  }
  return shots;
}

/** Open `url` in its own browser, screenshot it at each viewport, then tear down. */
export async function captureShots(
  config: ResolvedConfig,
  url: string,
  viewports: ViewportInput[],
  settleMs = 400,
): Promise<Shot[]> {
  const opened = await selectEngineForConfig(config).open(config);
  const page = opened.page ?? (await opened.context.newPage());
  try {
    return await shotsOnPage(page, config, url, viewports, settleMs);
  } finally {
    await teardownOpened(opened);
  }
}
