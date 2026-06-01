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
 * Capture the indexed interactive snapshot across all frames, tagging each
 * element with a (frame-local) ref attribute and exposing a frame-scoped `ref`.
 * Detached frames and frames that reject evaluation (e.g. mid-navigation) are
 * skipped rather than aborting the whole snapshot.
 */
export async function captureSnapshot(page: Page, selectors = false): Promise<InteractiveElement[]> {
  const frames = page.frames();
  const all: InteractiveElement[] = [];
  const arg = { selectors };
  let global = 0;
  for (let f = 0; f < frames.length && all.length < MAX_ELEMENTS; f++) {
    const frame = frames[f];
    if (!frame || frame.isDetached()) continue;
    let local: InteractiveElement[];
    try {
      local = await evalScriptArg<InteractiveElement[], typeof arg>(frame, SNAPSHOT_SCRIPT, arg);
    } catch {
      continue;
    }
    for (const el of local) {
      if (all.length >= MAX_ELEMENTS) break;
      el.ref = f === 0 ? String(el.index) : `${f}:${el.index}`;
      if (f > 0) el.frame = f;
      el.index = global++;
      all.push(el);
    }
  }
  return all;
}
