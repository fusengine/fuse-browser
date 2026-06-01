/**
 * Execute a multi-step plan in one call: navigate / act / waitFor / extract.
 * Stops at the first failed step and returns a per-step report. Reduces the
 * number of LLM round-trips for predictable sequences.
 * @module agent/run-steps
 */
import type { Page } from "playwright";
import { type ActionInput, performAction } from "../actions/perform.js";
import { waitForCondition } from "../actions/wait-for.js";
import { detectChallenges } from "../extraction/challenges.js";
import { extractHotelOffers } from "../extraction/hotel-offers.js";
import { extractPrices } from "../extraction/prices.js";

/** A single step. `type` selects the operation; other fields are step args. */
export type RunStep = Record<string, unknown> & { type: string };

/** Result of one executed step. */
export interface StepResult {
  index: number;
  type: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

async function runWait(page: Page, step: RunStep): Promise<StepResult> {
  const r = await waitForCondition(page, {
    text: step.text as string | undefined,
    selector: step.selector as string | undefined,
    urlContains: step.urlContains as string | undefined,
    gone: step.gone as string | undefined,
    timeoutMs: step.timeoutMs as number | undefined,
  });
  return { index: 0, type: "wait_for", ok: r.ok, data: r, error: r.ok ? undefined : String(r.error) };
}

async function runExtract(page: Page, step: RunStep): Promise<StepResult> {
  const text = await page.locator("body").innerText({ timeout: 3_000 });
  const data: Record<string, unknown> = { url: page.url() };
  const kind = step.kind ?? "all";
  if (kind === "text" || kind === "all") data.text = text;
  if (kind === "prices" || kind === "all") {
    data.prices = extractPrices(text);
    data.hotelOffers = extractHotelOffers(text);
  }
  if (kind === "challenges" || kind === "all") data.challenges = await detectChallenges(page, text);
  return { index: 0, type: "extract", ok: true, data };
}

async function runOne(page: Page, step: RunStep, humanMode: boolean): Promise<StepResult> {
  if (step.type === "navigate") {
    await page.goto(String(step.url), { waitUntil: "domcontentloaded", timeout: 30_000 });
    return { index: 0, type: "navigate", ok: true, data: { url: page.url(), title: await page.title() } };
  }
  if (step.type === "wait_for") return runWait(page, step);
  if (step.type === "extract") return runExtract(page, step);
  const r = await performAction(page, step as ActionInput, humanMode);
  return { index: 0, type: step.type, ok: r.ok, data: r, error: r.ok ? undefined : String(r.error ?? "failed") };
}

/** Run steps in order, stopping at the first failure. */
export async function runSteps(page: Page, steps: RunStep[], humanMode = false): Promise<StepResult[]> {
  const results: StepResult[] = [];
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (!step) continue;
    const r = await runOne(page, step, humanMode);
    r.index = i;
    results.push(r);
    if (!r.ok) break;
  }
  return results;
}
