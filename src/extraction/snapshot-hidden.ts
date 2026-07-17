/**
 * "Hidden for accessibility" detection, mirroring Playwright's
 * `isElementHiddenForAria` (packages/injected/src/roleUtils.ts): `aria-hidden`
 * and `display:none` are STICKY down the ancestor chain (a descendant cannot
 * un-hide itself); `visibility:hidden|collapse` is checked only on the element
 * itself (CSS `visibility` inherits, so a descendant's `visibility:visible`
 * already resolves through `getComputedStyle`, no manual override needed).
 * `display:contents` never counts as `display:none`, so it does not blanket-
 * hide the subtree. Deliberately NOT signals here: offscreen position
 * (`offsetParent===null`, e.g. `position:fixed`), `opacity:0`, or `sr-only`
 * absolute-offscreen patterns — none of those are ARIA-hidden.
 * @module extraction/snapshot-hidden
 */

/**
 * Browser-side definition injected into {@link SNAPSHOT_SCRIPT}: defines
 * `isElementHiddenForAria(el)`, embedded the same way `selector.ts` embeds
 * `SELECTOR_DEFS`.
 */
export const HIDDEN_DEFS = `
  const ariaHiddenAncestor = (el) => {
    let node = el;
    while (node && node.nodeType === 1) {
      if (node.getAttribute('aria-hidden') === 'true') return true;
      if (getComputedStyle(node).display === 'none') return true;
      node = node.parentElement || (node.parentNode && node.parentNode.host);
    }
    return false;
  };
  const isElementHiddenForAria = (el) => {
    const v = getComputedStyle(el).visibility;
    if (v === 'hidden' || v === 'collapse') return true;
    return ariaHiddenAncestor(el);
  };`;

/**
 * Minimal ancestor-chain shape mirroring the DOM API surface used by
 * {@link HIDDEN_DEFS} above, so the same decision logic is unit-testable
 * without a real DOM (same intent as `selector.ts`'s `isStableToken`).
 */
export interface AriaHiddenNode {
  /** This node's own `aria-hidden` attribute value, or `null`/absent. */
  ariaHidden?: string | null;
  /** This node's own computed `display`. */
  display?: string;
  /** This node's own (already-inherited) computed `visibility`. */
  visibility?: string;
  /** Parent in the ancestor chain (host element, for a shadow-root parent). */
  parent?: AriaHiddenNode | null;
}

/**
 * Node-testable mirror of the browser-side `isElementHiddenForAria`: true if
 * the node's own resolved `visibility` is hidden/collapse, OR if `aria-hidden`
 * or `display:none` appears on the node or any ancestor.
 */
export function isHiddenForAriaMirror(node: AriaHiddenNode): boolean {
  if (node.visibility === "hidden" || node.visibility === "collapse") return true;
  let cur: AriaHiddenNode | null | undefined = node;
  while (cur) {
    if (cur.ariaHidden === "true") return true;
    if (cur.display === "none") return true;
    cur = cur.parent;
  }
  return false;
}
