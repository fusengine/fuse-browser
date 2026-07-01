/**
 * Browser-side snapshot walk: collects interactive elements, piercing OPEN
 * Shadow DOM recursively. Iframes are NOT descended here — each frame is walked
 * separately on the Node side via {@link captureSnapshot} (cross-origin frames
 * are unreadable from the parent context, and same-origin ones would duplicate).
 * Closed shadow roots are inaccessible by browser SOP and stay opaque.
 * @module extraction/snapshot-walk
 */

import { SELECTOR_DEFS } from "./selector.js";

/** Attribute injected on each interactive element to anchor a stable ref. */
export const REF_ATTRIBUTE = "data-fuse-ref";

const SELECTOR =
  "button,a,input,select,textarea,[role=button],[role=combobox],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=menuitem],[role=option],[contenteditable=true]";

/**
 * Arrow-function source (run via `evalScript` in each frame). Stamps a LOCAL
 * `data-fuse-ref` (per-frame index) and returns elements in visitation order;
 * the Node side rewrites `index` to a global counter and adds the frame-scoped
 * `ref`. Capped at 200 elements per frame.
 */
export const SNAPSHOT_SCRIPT = `(arg) => {
  const SEL = '${SELECTOR}';
  const wantSel = !!(arg && arg.selectors);${SELECTOR_DEFS}
  const obscured = (el, r) => {
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    if (r.width === 0 || cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false;
    const top = document.elementFromPoint(cx, cy);
    return !!top && top !== el && !el.contains(top) && !top.contains(el);
  };
  const out = [];
  const describe = (el, index) => {
    const r = el.getBoundingClientRect();
    const val = typeof el.value === 'string' ? el.value : null;
    const isCheck = el.type === 'checkbox' || el.type === 'radio';
    return {
      index,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 120),
      role: el.getAttribute('role'), id: el.id || null, name: el.getAttribute('name'),
      type: el.getAttribute('type'), href: el.getAttribute('href'),
      value: el.type === 'password' ? null : (val ? val.slice(0, 120) : null),
      hasValue: !!val, placeholder: el.getAttribute('placeholder'),
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
      checked: isCheck ? !!el.checked : undefined,
      options: el.tagName === 'SELECT' ? [...el.options].slice(0, 12).map((o) => o.label || o.value) : undefined,
      ariaExpanded: el.getAttribute('aria-expanded'), ariaControls: el.getAttribute('aria-controls'),
      visible: r.width > 0 && r.height > 0, obscured: obscured(el, r),
      selector: wantSel ? genSelector(el) : undefined,
      box: {x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height)}
    };
  };
  const visit = (root) => {
    if (out.length >= 200) return;
    for (const el of root.querySelectorAll(SEL)) {
      if (out.length >= 200) return;
      const i = out.length;
      el.setAttribute('${REF_ATTRIBUTE}', String(i));
      out.push(describe(el, i));
    }
    for (const host of root.querySelectorAll('*')) {
      if (host.shadowRoot) visit(host.shadowRoot);
    }
  };
  visit(document);
  return out;
}`;
