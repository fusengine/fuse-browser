/**
 * Auto-healing locator resolution (Playwright "healer" pattern). When the
 * primary selector/ref of a click/fill no longer matches a changed page, this
 * re-resolves the target by accessible role+name, then visible text, then a
 * fresh snapshot re-matched against the original label — returning the first
 * visible locator (or `null` when nothing recovers).
 * @module actions/heal-locator
 */
import type { Locator, Page } from "playwright";
import type { InteractiveElement } from "../interfaces/extraction.js";
import { logger } from "../lib/logger.js";
import { escapeRegExp } from "../lib/text.js";
import { refLocator } from "./ref-locator.js";

/** Re-resolve a changed page. `snapshotFn` re-captures the interactive tree. */
export type SnapshotFn = (page: Page) => Promise<InteractiveElement[]>;

/** Return the locator if it resolves to a visible element, else `null`. */
async function firstVisible(locator: Locator | null): Promise<Locator | null> {
  if (!locator) return null;
  try {
    if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
      return locator.first();
    }
  } catch {
    // Detached frame / mid-navigation: treat as a miss, let the next strategy try.
  }
  return null;
}

/** Lowercased haystack of an element's accessible-ish text fields. */
function elementText(el: InteractiveElement): string {
  return `${el.text} ${el.name ?? ""} ${el.value ?? ""} ${el.placeholder ?? ""}`
    .toLowerCase()
    .trim();
}

/**
 * Re-snapshot the page and resolve the first visible interactive element whose
 * text/name/value/placeholder contains `target` (case-insensitive), via its ref.
 */
async function healViaSnapshot(
  page: Page,
  target: string,
  snapshotFn: SnapshotFn,
): Promise<Locator | null> {
  let elements: InteractiveElement[];
  try {
    elements = await snapshotFn(page);
  } catch {
    return null;
  }
  const needle = target.toLowerCase();
  for (const el of elements) {
    if (el.ref === undefined || !elementText(el).includes(needle)) continue;
    const hit = await firstVisible(refLocator(page, el.ref));
    if (hit) return hit;
  }
  return null;
}

/**
 * Recover a locator for `target` after the primary resolution failed. Tries, in
 * order: (a) accessible role+name, (b) visible text, (c) fresh snapshot re-match.
 * Returns the first visible {@link Locator}, or `null` if nothing recovers.
 */
export async function healLocator(
  page: Page,
  target: string,
  snapshotFn: SnapshotFn,
): Promise<Locator | null> {
  if (!target.trim()) return null;
  const rx = new RegExp(escapeRegExp(target), "i");
  const byRole =
    (await firstVisible(page.getByRole("button", { name: rx }))) ??
    (await firstVisible(page.getByRole("link", { name: rx }))) ??
    (await firstVisible(page.getByRole("textbox", { name: rx })));
  const healed =
    byRole ??
    (await firstVisible(page.getByText(rx))) ??
    (await healViaSnapshot(page, target, snapshotFn));
  if (healed) logger.debug("heal_locator: recovered target", { target });
  return healed;
}
