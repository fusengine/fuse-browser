/**
 * "Prunable" detection for `browser_snapshot`'s `prune:true` (the "C4" rule):
 * an element is prunable iff (a) genuinely hidden — `Element.checkVisibility
 * ({checkVisibilityCSS, contentVisibilityAuto})` is `false` (display:none
 * self/ancestor, content-visibility:hidden, visibility:hidden/collapse) — OR
 * (b) under an `aria-hidden="true"` ancestor AND NOT focusable (decorative).
 * `checkVisibility()` deliberately ignores `aria-hidden` (pure CSS/box-model
 * signal; Baseline Chrome 105/Firefox 106/Safari 17.4), which is exactly why a
 * VISIBLE+FOCUSABLE element under an `aria-hidden` ancestor — e.g. an open
 * modal `<dialog>`/`[role=dialog]` whose SPA also marks a sibling/root wrapper
 * `aria-hidden` — is KEPT, not pruned. Deliberately NOT used: CDP
 * `Accessibility.getFullAXTree` (Chromium-only, would break firefox/webkit).
 * @module extraction/snapshot-hidden
 */

/**
 * Browser-side definitions injected into {@link SNAPSHOT_SCRIPT}: defines
 * `isPrunable(el)`, embedded the same way `selector.ts` embeds `SELECTOR_DEFS`.
 */
export const HIDDEN_DEFS = `
  const hasAriaHiddenAncestor = (el) => {
    let node = el;
    while (node && node.nodeType === 1) {
      if (node.getAttribute('aria-hidden') === 'true') return true;
      node = node.parentElement || (node.parentNode && node.parentNode.host);
    }
    return false;
  };
  const isFocusable = (el) => {
    if (el.closest('[inert]')) return false;
    if ('disabled' in el && el.disabled) return false;
    const tag = el.tagName;
    const native =
      (tag === 'A' && el.hasAttribute('href')) ||
      tag === 'BUTTON' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'IFRAME' ||
      (tag === 'INPUT' && el.type !== 'hidden') ||
      el.isContentEditable;
    const ti = el.getAttribute('tabindex');
    const tabindexOk = ti !== null && !Number.isNaN(parseInt(ti, 10)) && parseInt(ti, 10) >= 0;
    if (!native && !tabindexOk) return false;
    return el.tabIndex >= 0;
  };
  const isPrunable = (el) => {
    if (!el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true })) return true;
    return hasAriaHiddenAncestor(el) && !isFocusable(el);
  };`;

/**
 * Minimal ancestor-chain shape mirroring the DOM surface used by {@link
 * HIDDEN_DEFS} above, so the same decision logic is unit-testable without a
 * real DOM (same intent as `selector.ts`'s `isStableToken`). `focusable` is a
 * precomputed stand-in for the browser-side `isFocusable(el)` result — the
 * mirror tests the C4 combination logic, not DOM focusability itself.
 */
export interface PrunableNode {
  /** This node's own `aria-hidden` attribute value, or `null`/absent. */
  ariaHidden?: string | null;
  /** This node's own computed `display`. */
  display?: string;
  /** This node's own (already-inherited) computed `visibility`. */
  visibility?: string;
  /** Precomputed focusability of this exact node (native tag/tabindex/disabled/inert). */
  focusable?: boolean;
  /** Parent in the ancestor chain (host element, for a shadow-root parent). */
  parent?: PrunableNode | null;
}

/** True if `checkVisibility({checkVisibilityCSS:true})` would resolve to hidden. */
function isCssHiddenMirror(node: PrunableNode): boolean {
  if (node.visibility === "hidden" || node.visibility === "collapse") return true;
  let cur: PrunableNode | null | undefined = node;
  while (cur) {
    if (cur.display === "none") return true;
    cur = cur.parent;
  }
  return false;
}

/** True if `aria-hidden="true"` appears on the node or any ancestor (sticky). */
function hasAriaHiddenAncestorMirror(node: PrunableNode): boolean {
  let cur: PrunableNode | null | undefined = node;
  while (cur) {
    if (cur.ariaHidden === "true") return true;
    cur = cur.parent;
  }
  return false;
}

/**
 * Node-testable mirror of the browser-side `isPrunable`: true if the node is
 * CSS-hidden (display:none anywhere up the chain, or own visibility:hidden/
 * collapse), OR it is under an `aria-hidden` ancestor AND not focusable.
 */
export function isPrunableMirror(node: PrunableNode): boolean {
  if (isCssHiddenMirror(node)) return true;
  return hasAriaHiddenAncestorMirror(node) && node.focusable !== true;
}
