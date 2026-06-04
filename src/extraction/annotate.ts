/**
 * Set-of-Marks overlay: draw numbered badges (= each element's `data-fuse-ref`,
 * set by captureSnapshot) over the visible interactive elements, so a vision
 * model sees the page AND targets by `ref`. Inject → screenshot → remove.
 * Main-frame, viewport-only (iframe elements keep their own refs but are not
 * overlaid here). Provider-agnostic: returns a JPEG the model consumes via MCP.
 * @module extraction/annotate
 */
import type { Page } from "playwright";
import { evalScript } from "../lib/evaluate.js";

/** Browser script: overlay a labelled box on each visible `[data-fuse-ref]`; returns the count. */
const ANNOTATE_SCRIPT = `() => {
  const ID = "__fuse_som_overlay__";
  const prev = document.getElementById(ID); if (prev) prev.remove();
  const layer = document.createElement('div');
  layer.id = ID;
  layer.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;pointer-events:none;';
  const vw = window.innerWidth, vh = window.innerHeight;
  let n = 0;
  for (const el of document.querySelectorAll('[data-fuse-ref]')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    const ref = el.getAttribute('data-fuse-ref');
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;box-sizing:border-box;border:2px solid #e11d48;left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;';
    const tag = document.createElement('div');
    tag.textContent = ref;
    tag.style.cssText = 'position:absolute;left:'+Math.max(0,r.left)+'px;top:'+Math.max(0,r.top-14)+'px;background:#e11d48;color:#fff;font:bold 11px/14px monospace;padding:0 3px;border-radius:2px;white-space:nowrap;';
    layer.appendChild(box); layer.appendChild(tag);
    n++;
  }
  document.documentElement.appendChild(layer);
  return n;
}`;

/** Browser script: remove the overlay. */
const UNANNOTATE_SCRIPT = `() => { const e = document.getElementById("__fuse_som_overlay__"); if (e) e.remove(); }`;

/** Draw SoM badges (= refs), take a JPEG viewport screenshot, then remove the badges. */
export async function annotatedScreenshot(page: Page): Promise<{ base64: string; marks: number }> {
  const marks = await evalScript<number>(page, ANNOTATE_SCRIPT);
  try {
    const buf = await page.screenshot({ type: "jpeg", quality: 70 });
    return { base64: buf.toString("base64"), marks };
  } finally {
    await evalScript(page, UNANNOTATE_SCRIPT).catch(() => {});
  }
}
