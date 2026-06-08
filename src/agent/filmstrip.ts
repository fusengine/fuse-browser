/**
 * Wheel-driven "filmstrip" capture for scroll-jacked pages: the document is one
 * viewport tall and the scroll is faked in JS/canvas, so `fullPage` only gets
 * the hero. We drive the site's own scroll with real wheel events and save N
 * viewport frames — real sections on smooth-scroll sites, animation states on
 * pure-WebGL ones. The honest capture when fullPage cannot work.
 * @module agent/filmstrip
 */
import { join } from "node:path";
import type { Page } from "playwright";
import { sleep } from "../lib/retry.js";
import type { Shot } from "./shots.js";

/** Default number of filmstrip frames for a scroll-jacked page. */
export const FILMSTRIP_FRAMES = 6;

/**
 * Capture `frames` viewport screenshots, advancing the page with a real wheel
 * event between each — the fallback for a scroll-jacked page.
 *
 * @param page - The page, already settled at the top.
 * @param outputDir - Directory for the PNGs.
 * @param runId - Shared run-id prefix.
 * @param name - Viewport label.
 * @param size - Viewport size (for the Shot dimensions).
 * @param settleMs - Settle delay added after each wheel step.
 * @param frames - Frame count (default {@link FILMSTRIP_FRAMES}).
 * @returns One Shot per frame, flagged `scrollJacked` with a `frame` index.
 */
export async function captureFilmstrip(
  page: Page,
  outputDir: string,
  runId: string,
  name: string,
  size: { width: number; height: number },
  settleMs = 400,
  frames = FILMSTRIP_FRAMES,
): Promise<Shot[]> {
  const shots: Shot[] = [];
  await page.mouse.move(Math.floor(size.width / 2), Math.floor(size.height / 2)).catch(() => {});
  for (let i = 0; i < frames; i += 1) {
    const path = join(outputDir, `${runId}-${name}-frame${i}.png`);
    await page.screenshot({ path, animations: "disabled" });
    shots.push({ viewport: name, width: size.width, height: size.height, path, scrollJacked: true, frame: i });
    await page.mouse.wheel(0, Math.floor(size.height * 0.9)).catch(() => {});
    await sleep(settleMs + 600);
  }
  return shots;
}
