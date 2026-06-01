/**
 * Resolve a snapshot `ref` to a Playwright locator, honoring the frame-scoped
 * ref scheme produced by {@link captureSnapshot}: `"<frame>:<local>"` targets
 * `page.frames()[frame]`, a bare `"<local>"` targets the main frame.
 * @module actions/ref-locator
 */
import type { Locator, Page } from "playwright";
import { REF_ATTRIBUTE } from "../extraction/snapshot.js";

/** A ref split into its frame ordinal and frame-local index. */
export interface ParsedRef {
  frame: number;
  local: string;
}

/** Parse a ref string/number into `{ frame, local }` (bare value → main frame). */
export function parseRef(ref: string | number): ParsedRef {
  const s = String(ref);
  const sep = s.indexOf(":");
  if (sep === -1) return { frame: 0, local: s };
  return { frame: Number(s.slice(0, sep)), local: s.slice(sep + 1) };
}

/** Locator for `ref`, scoped to its owning frame; `null` if the frame is gone. */
export function refLocator(page: Page, ref: string | number): Locator | null {
  const { frame, local } = parseRef(ref);
  const target = page.frames()[frame];
  if (!target) return null;
  return target.locator(`[${REF_ATTRIBUTE}="${local}"]`).first();
}
