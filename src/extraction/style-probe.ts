/**
 * Design inspection: computed styles + box + WCAG text-contrast for one element
 * (by `data-fuse-ref`, set by captureSnapshot). Main-frame.
 * @module extraction/style-probe
 */
import type { Page } from "playwright";
import type { StyleReport } from "../interfaces/style.js";
import { contrastRatio, parseCssColor, wcagLevel } from "../lib/contrast.js";
import { evalScriptArg } from "../lib/evaluate.js";

/** Raw computed style gathered in the page (everything except the derived contrast). */
type RawStyle = Omit<StyleReport, "ref" | "contrast">;

/** Browser script: computed style of `[data-fuse-ref=ref]` + nearest opaque background. */
const STYLE_SCRIPT = `(ref) => {
  const el = document.querySelector('[data-fuse-ref="' + ref + '"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  let bg = cs.backgroundColor, node = el;
  while (node && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
    node = node.parentElement;
    bg = node ? getComputedStyle(node).backgroundColor : 'rgb(255, 255, 255)';
  }
  return {
    box: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
    font: { family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight },
    color: cs.color,
    background: bg || 'rgb(255, 255, 255)',
    padding: cs.padding, margin: cs.margin, border: cs.border,
  };
}`;

/** Inspect one element's style + box + WCAG contrast. Null if the ref is absent. */
export async function inspectStyle(page: Page, ref: string): Promise<StyleReport | null> {
  const raw = await evalScriptArg<RawStyle | null, string>(page, STYLE_SCRIPT, ref);
  if (!raw) return null;
  const fg = parseCssColor(raw.color);
  const bg = parseCssColor(raw.background);
  const sizePx = Number.parseFloat(raw.font.size) || 16;
  const large = sizePx >= 24 || (sizePx >= 18.66 && Number(raw.font.weight) >= 700);
  const contrast = fg && bg ? wcagLevel(contrastRatio(fg, bg), large) : null;
  return { ref, ...raw, contrast };
}
