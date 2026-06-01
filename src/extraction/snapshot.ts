/**
 * Accessibility-style snapshot: tag each interactive element with a stable
 * `data-fuse-ref` and return an indexed list the LLM can reason about.
 * The ref survives until the page re-renders, enabling deterministic
 * `browser_act` targeting via `[data-fuse-ref="N"]`.
 * @module extraction/snapshot
 */
import type { Page } from "playwright";
import type { InteractiveElement } from "../interfaces/extraction.js";
import { evalScript } from "../lib/evaluate.js";

/** Attribute injected on each interactive element to anchor a stable ref. */
export const REF_ATTRIBUTE = "data-fuse-ref";

const SNAPSHOT_SCRIPT = `() => [...document.querySelectorAll('button,a,input,select,textarea,[role=button]')]
  .slice(0, 120)
  .map((el, index) => {
    el.setAttribute('${REF_ATTRIBUTE}', String(index));
    const rect = el.getBoundingClientRect();
    return {
      index,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 120),
      role: el.getAttribute('role'),
      id: el.id || null,
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      href: el.getAttribute('href'),
      visible: rect.width > 0 && rect.height > 0,
      box: {x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)}
    };
  })`;

/** Capture the indexed interactive snapshot, tagging each element with a ref. */
export async function captureSnapshot(page: Page): Promise<InteractiveElement[]> {
  return evalScript<InteractiveElement[]>(page, SNAPSHOT_SCRIPT);
}
