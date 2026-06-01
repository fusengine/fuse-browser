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

const SELECTOR =
  "button,a,input,select,textarea,[role=button],[role=combobox],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=menuitem],[role=option],[contenteditable=true]";

const SNAPSHOT_SCRIPT = `() => {
  const obscured = (el, r) => {
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    if (r.width === 0 || cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false;
    const top = document.elementFromPoint(cx, cy);
    return !!top && top !== el && !el.contains(top) && !top.contains(el);
  };
  return [...document.querySelectorAll('${SELECTOR}')].slice(0, 200).map((el, index) => {
    el.setAttribute('${REF_ATTRIBUTE}', String(index));
    const r = el.getBoundingClientRect();
    const val = typeof el.value === 'string' ? el.value : null;
    const isCheck = el.type === 'checkbox' || el.type === 'radio';
    return {
      index,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 120),
      role: el.getAttribute('role'),
      id: el.id || null,
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      href: el.getAttribute('href'),
      value: val ? val.slice(0, 120) : null,
      placeholder: el.getAttribute('placeholder'),
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
      checked: isCheck ? !!el.checked : undefined,
      options: el.tagName === 'SELECT' ? [...el.options].slice(0, 12).map((o) => o.label || o.value) : undefined,
      ariaExpanded: el.getAttribute('aria-expanded'),
      ariaControls: el.getAttribute('aria-controls'),
      visible: r.width > 0 && r.height > 0,
      obscured: obscured(el, r),
      box: {x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height)}
    };
  });
}`;

/** Capture the indexed interactive snapshot, tagging each element with a ref. */
export async function captureSnapshot(page: Page): Promise<InteractiveElement[]> {
  return evalScript<InteractiveElement[]>(page, SNAPSHOT_SCRIPT);
}
