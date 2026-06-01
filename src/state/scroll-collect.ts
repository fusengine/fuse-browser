/**
 * Scroll-and-collect loop for virtualized/infinite lists: repeatedly harvest the
 * mounted rows, scroll the container one step, settle, and merge until the
 * container stops growing (K stable rounds) or refuses to advance (true bottom)
 * or a step cap is hit. Returns the deduped union of rows seen.
 * @module state/scroll-collect
 */
import type { Page } from "playwright";
import { mergeItems, type RawRow } from "../extraction/collect-merge.js";
import { extractPrices } from "../extraction/prices.js";
import { SCAN_SCRIPT } from "../extraction/scroll-script.js";
import type { CollectedItem } from "../interfaces/extraction.js";
import { evalScriptArg } from "../lib/evaluate.js";

/** Options for {@link scrollCollect}. */
export interface CollectOptions {
  item: string;
  container?: string;
  maxSteps?: number;
  stableRounds?: number;
  extractPrices?: boolean;
  settleMs?: number;
}

/** Result of a scroll-collect run. */
export interface CollectResult {
  items: CollectedItem[];
  steps: number;
  reachedEnd: boolean;
}

interface StepOut {
  items: RawRow[];
  geo: { moved: number; atEnd: boolean; scrollHeight: number };
}

/** Exhaust a (virtualized) list by scrolling its container and merging rows. */
export async function scrollCollect(page: Page, opts: CollectOptions): Promise<CollectResult> {
  const maxSteps = opts.maxSteps ?? 60;
  const need = opts.stableRounds ?? 3;
  const arg = { item: opts.item, selector: opts.container ?? null, stepFraction: 0.9 };
  const pricer = opts.extractPrices ? extractPrices : null;
  const seen = new Map<string, CollectedItem>();
  let stable = 0;
  let prevH = 0;
  let reachedEnd = false;
  let steps = 0;
  for (; steps < maxSteps; steps++) {
    const out = await evalScriptArg<StepOut, typeof arg>(page, SCAN_SCRIPT, arg);
    const added = mergeItems(seen, out.items, pricer);
    const grew = out.geo.scrollHeight > prevH + 4;
    prevH = out.geo.scrollHeight;
    if (out.geo.moved < 2) {
      reachedEnd = true;
      break;
    }
    stable = !grew && added === 0 ? stable + 1 : 0;
    if (stable >= need) {
      reachedEnd = out.geo.atEnd;
      break;
    }
    await page.waitForTimeout(opts.settleMs ?? 150);
  }
  return { items: [...seen.values()], steps: steps + 1, reachedEnd };
}
