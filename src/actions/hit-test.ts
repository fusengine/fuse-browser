/**
 * Point-based hit testing: confirms a locator's element is genuinely the
 * top-most hit at a page coordinate before trusting a bypass-actionability
 * click (`force:true` or a raw `page.mouse.click`). Verification failures
 * (no DOM access on a stub, a detached element) default to "clear" so a real
 * click is never blocked by a probe hiccup — only a PROVEN foreign element on
 * top withholds success. A locator outside the main frame skips the probe
 * entirely (see {@link isTopElement}'s `isMainFrame` param).
 * @module actions/hit-test
 */
import type { Locator } from "playwright";

/**
 * Minimal duck-typed shape of a DOM node as seen inside `locator.evaluate()`.
 * This tsconfig has no `dom` lib, so `Element`/`ShadowRoot` aren't declared —
 * matching this codebase's existing convention of untyped/string-based
 * evaluate scripts. `nodeType === 11` + a `host` is how a `ShadowRoot` is
 * identified without `instanceof` (unavailable with no `dom` lib).
 */
interface TopHit {
  nodeType: number;
  host?: TopHit;
  contains(other: TopHit | null): boolean;
  getRootNode?(): TopHit | null;
}

/** `locator.boundingBox()`, tolerant of locators/stubs that don't support it. */
export async function safeBoundingBox(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    return await locator.boundingBox();
  } catch {
    return null;
  }
}

/** True when `node` is a `ShadowRoot`: `nodeType` 11 (`DOCUMENT_FRAGMENT_NODE`) plus a `host`. */
function isShadowRoot(node: TopHit | null | undefined): node is TopHit & { host: TopHit } {
  return !!node && node.nodeType === 11 && !!node.host;
}

/** Same node, or an ancestor/descendant relationship, between two hit-test nodes. */
function related(a: TopHit, b: TopHit): boolean {
  return a === b || a.contains(b) || b.contains(a);
}

/**
 * True when `locator`'s own element — or an ancestor/descendant of it, or (for
 * an element inside a shadow tree) its shadow host chain — is the top-most
 * hit at page point (x, y). `false` only when a genuinely foreign element
 * (e.g. a modal/overlay) covers that point in the SAME frame.
 *
 * `document.elementFromPoint`/`elementsFromPoint` retarget to the shadow HOST
 * when called on `document` itself (open or closed root alike) — without
 * piercing that retargeting, a legitimate shadow-DOM element is wrongly
 * reported "obscured" because neither `Node.contains()` direction crosses a
 * shadow boundary. This walks `self.getRootNode()?.host` (nested shadows
 * included) and also allows a match against the topmost hit found there.
 *
 * @param isMainFrame - `false` skips the probe entirely (default `true`,
 *   unchanged prior behavior). Playwright's `Locator` exposes no public
 *   "owning frame" accessor, so a caller whose locator resolves in a CHILD
 *   frame must say so explicitly: `boundingBox()`'s (x, y) is in
 *   main-frame/page-viewport coordinates, and evaluating
 *   `document.elementsFromPoint` with those coordinates inside a child
 *   frame's own document checks the wrong coordinate space.
 */
export async function isTopElement(
  locator: Locator,
  x: number,
  y: number,
  isMainFrame = true,
): Promise<boolean> {
  if (!isMainFrame) return true;
  try {
    return await locator.evaluate(
      (el, [px, py]) => {
        const doc = (
          globalThis as unknown as { document: { elementsFromPoint(a: number, b: number): TopHit[] } }
        ).document;
        const stack = doc.elementsFromPoint(px, py);
        const topmost = stack[0];
        const self = el as unknown as TopHit;
        if (!topmost) return true;
        if (related(self, topmost)) return true;
        let root = self.getRootNode?.() ?? null;
        while (isShadowRoot(root)) {
          if (related(root.host, topmost)) return true;
          root = root.host.getRootNode?.() ?? null;
        }
        return false;
      },
      [x, y] as [number, number],
    );
  } catch {
    return true;
  }
}
