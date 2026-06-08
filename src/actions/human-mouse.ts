/**
 * Human-like cursor motion before a click: travel to the target along a cubic
 * Bézier path with eased, jittered, variably-timed steps. Behavioral anti-bots
 * (ML on mouse velocity/curvature/timing) flag straight lines, constant speed
 * and teleports; a curved human reach defeats that. Used only in `humanMode`.
 * @module actions/human-mouse
 */
import type { Locator, Page } from "playwright";
import { sleep } from "../lib/retry.js";
import { randInt } from "../lib/text.js";

/** A 2D point. */
interface Pt {
  x: number;
  y: number;
}

/** Cubic Bézier point at `t` ∈ [0,1] for control points `p0..p3`. */
export function cubicBezier(t: number, p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Ease-in-out cubic — slow start and end, like a human reach. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Move the cursor to the centre of `locator` along a human Bézier path.
 * No-op when the element has no box (invisible/detached).
 *
 * @param page - The page whose mouse to drive.
 * @param locator - The target element.
 */
export async function humanMoveTo(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return;
  const from: Pt = { x: randInt(0, 80), y: randInt(0, 80) };
  const to: Pt = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const dist = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
  const spread = Math.floor(dist / 4);
  const ctrl = (): Pt => ({
    x: (from.x + to.x) / 2 + randInt(-spread, spread),
    y: (from.y + to.y) / 2 + randInt(-spread, spread),
  });
  const p1 = ctrl();
  const p2 = ctrl();
  const steps = randInt(24, 40);
  const perStep = Math.max(4, Math.floor((300 + dist * 0.6) / steps));
  for (let i = 1; i <= steps; i += 1) {
    const pt = cubicBezier(easeInOutCubic(i / steps), from, p1, p2, to);
    await page.mouse.move(pt.x + randInt(-1, 1), pt.y + randInt(-1, 1)).catch(() => {});
    await sleep(perStep + randInt(-3, 3));
  }
}
