/**
 * Auto-scroll a page to trigger lazy-load / infinite-scroll until the list
 * stabilises, a target count is reached, or a cap is hit.
 * @module actions/auto-scroll
 */
import type { Page } from "playwright";
import type { AutoScrollOpts, ScrollProbe, StopInput, StopState } from "../interfaces/auto-scroll.js";
import { evalScriptArg } from "../lib/evaluate.js";

/**
 * Pure decision: should auto-scroll stop, and what is the new idle streak?
 * Stops on reaching the selector target, the idle threshold, or the cap.
 */
export function decideStop(input: StopInput): StopState {
  const { prev, curr, idle, rounds, idleRounds, maxScrolls, minCount, hasSelector } = input;
  if (hasSelector && curr.count >= minCount) return { stop: true, idle };
  const grew = prev === null || curr.height > prev.height;
  const nextIdle = grew ? 0 : idle + 1;
  if (nextIdle >= idleRounds) return { stop: true, idle: nextIdle };
  if (rounds >= maxScrolls) return { stop: true, idle: nextIdle };
  return { stop: false, idle: nextIdle };
}

/** In-page probe: scroll to the bottom and report height + optional count. */
const PROBE_SCRIPT = `(sel) => {
  window.scrollTo(0, document.body.scrollHeight);
  return {
    height: document.body.scrollHeight,
    count: sel ? document.querySelectorAll(sel).length : 0,
  };
}`;

/**
 * Scroll until the page stops growing, a selector reaches `minCount`, or
 * `maxScrolls` is hit. Triggers lazy-load before bulk extraction.
 */
export async function autoScroll(page: Page, opts: AutoScrollOpts = {}): Promise<{ rounds: number; height: number }> {
  const maxScrolls = opts.maxScrolls ?? 20;
  const idleRounds = opts.idleRounds ?? 2;
  const minCount = opts.minCount ?? 1;
  const delayMs = opts.delayMs ?? 600;
  const sel = opts.untilSelector ?? null;
  let prev: ScrollProbe | null = null;
  let idle = 0;
  let rounds = 0;
  let height = 0;
  while (rounds < maxScrolls) {
    const curr = await evalScriptArg<ScrollProbe, string | null>(page, PROBE_SCRIPT, sel);
    rounds += 1;
    height = curr.height;
    const next = decideStop({ prev, curr, idle, rounds, idleRounds, maxScrolls, minCount, hasSelector: sel !== null });
    idle = next.idle;
    if (next.stop) break;
    prev = curr;
    await page.waitForTimeout(delayMs);
  }
  return { rounds, height };
}
