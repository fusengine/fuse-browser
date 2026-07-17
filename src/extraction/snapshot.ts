/**
 * Accessibility-style snapshot: tag each interactive element with a stable
 * `data-fuse-ref` and return an indexed list the LLM can reason about. The walk
 * runs in EVERY frame (`page.frames()`) and pierces open Shadow DOM, so refs
 * cover iframes (same- and cross-origin) and web components. Each element's
 * `ref` is frame-scoped (`"<frame>:<local>"`, bare `"<local>"` for the main
 * frame) and resolves via {@link refLocator}.
 * @module extraction/snapshot
 */
import type { Page } from "playwright";
import type { InteractiveElement } from "../interfaces/extraction.js";
import { evalScriptArg } from "../lib/evaluate.js";
import { SNAPSHOT_SCRIPT } from "./snapshot-walk.js";

export { REF_ATTRIBUTE } from "./snapshot-walk.js";

/** Soft cap on total elements across all frames, to bound output size. */
const MAX_ELEMENTS = 400;

/**
 * Browser-returned element plus the internal `prunable` scratch flag (the C4
 * decision from `snapshot-hidden.ts`). Never exposed on the final {@link
 * InteractiveElement} output — used only to decide pruning, then stripped in
 * {@link captureSnapshot}.
 */
type RawElement = InteractiveElement & { prunable?: boolean };

/**
 * Whether a raw element survives pruning: kept unless `prune` is on AND the
 * element was flagged prunable (genuinely hidden, or decorative under an
 * `aria-hidden` ancestor and not focusable — see `snapshot-hidden.ts`).
 * A visible+focusable element under an `aria-hidden` ancestor (e.g. inside an
 * open modal dialog) is NOT prunable and is always kept. Exported for unit
 * testing.
 */
export function shouldKeep(prunable: boolean | undefined, prune: boolean): boolean {
  return !(prune && prunable === true);
}

/**
 * Capture the indexed interactive snapshot across all frames, tagging each
 * element with a (frame-local) ref attribute and exposing a frame-scoped `ref`.
 * Detached frames and frames that reject evaluation (e.g. mid-navigation) are
 * skipped rather than aborting the whole snapshot. When `prune` is `true`,
 * elements that are genuinely hidden (`Element.checkVisibility()` false —
 * `display:none`, `content-visibility:hidden`, `visibility:hidden`/`collapse`)
 * OR decorative under an `aria-hidden` ancestor (present but NOT focusable)
 * are dropped. A visible AND focusable element under an `aria-hidden`
 * ancestor — e.g. an open modal `<dialog>`/`[role=dialog]` whose SPA also
 * marks a sibling/root wrapper `aria-hidden` — is always kept. Default
 * `false` keeps the output identical to the pre-pruning behavior.
 */
export async function captureSnapshot(
  page: Page,
  selectors = false,
  prune = false,
): Promise<InteractiveElement[]> {
  const frames = page.frames();
  const all: InteractiveElement[] = [];
  const arg = { selectors };
  let global = 0;
  for (let f = 0; f < frames.length && all.length < MAX_ELEMENTS; f++) {
    const frame = frames[f];
    if (!frame || frame.isDetached()) continue;
    let local: RawElement[];
    try {
      local = await evalScriptArg<RawElement[], typeof arg>(frame, SNAPSHOT_SCRIPT, arg);
    } catch {
      continue;
    }
    for (const raw of local) {
      if (all.length >= MAX_ELEMENTS) break;
      const { prunable, ...el } = raw;
      if (!shouldKeep(prunable, prune)) continue;
      el.ref = f === 0 ? String(el.index) : `${f}:${el.index}`;
      if (f > 0) el.frame = f;
      el.index = global++;
      all.push(el);
    }
  }
  return all;
}
