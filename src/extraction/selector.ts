/**
 * Robust CSS selector generation for the action cache. A `@medv/finder`-style
 * walk builds the shortest unique path, preferring stable hooks (data-testid ›
 * stable id › semantic class › nth-of-type) and rejecting generated tokens
 * (hashes, css-in-js, long digit runs). The browser-side defs are embedded into
 * the snapshot script; `isStableToken` mirrors the filter for unit testing.
 * @module extraction/selector
 */

/** A token (id/class) is unstable if it looks machine-generated. */
export function isStableToken(value: string | null | undefined): boolean {
  if (!value || value.length < 3) return false;
  return !/([0-9a-f]{5,}|\d{3,}|^(?:css|sc|jss|emotion|Mui|chakra|styled))/i.test(value);
}

/**
 * Browser-side definitions injected into snapshot scripts: defines `genSelector`
 * (returns a unique selector within the element's root, or null). Relative to
 * the element's root node, so light-DOM selectors work with `page.locator`;
 * shadow-scoped selectors are best-effort.
 */
export const SELECTOR_DEFS = `
  const UNSTABLE = /([0-9a-f]{5,}|\\d{3,}|^(?:css|sc|jss|emotion|Mui|chakra|styled))/i;
  const stableTok = (v) => !!v && v.length >= 3 && !UNSTABLE.test(v);
  const uniqSel = (root, sel) => { try { return root.querySelectorAll(sel).length === 1; } catch (e) { return false; } };
  const genSelector = (el) => {
    const root = el.getRootNode();
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== root) {
      let seg = '';
      for (const a of ['data-testid','data-test','data-cy','data-qa']) {
        const v = node.getAttribute && node.getAttribute(a);
        if (v) { seg = '[' + a + '="' + v + '"]'; break; }
      }
      if (!seg && node.id && stableTok(node.id)) seg = '#' + CSS.escape(node.id);
      if (!seg) {
        const cls = (node.classList ? [...node.classList] : []).filter(stableTok).slice(0, 2);
        const tag = node.tagName.toLowerCase();
        if (cls.length) seg = tag + cls.map((c) => '.' + CSS.escape(c)).join('');
        else {
          const sib = node.parentNode ? [...node.parentNode.children].filter((c) => c.tagName === node.tagName) : [node];
          seg = tag + (sib.length > 1 ? ':nth-of-type(' + (sib.indexOf(node) + 1) + ')' : '');
        }
      }
      parts.unshift(seg);
      const sel = parts.join(' > ');
      if (uniqSel(root, sel)) return sel;
      node = node.parentElement || (node.parentNode && node.parentNode.host);
    }
    const full = parts.join(' > ');
    return uniqSel(root, full) ? full : null;
  };`;
