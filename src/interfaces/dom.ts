/**
 * Minimal structural DOM types. The project's tsconfig omits the `dom` lib on
 * purpose, yet some pure helpers walk a DOM that exists both in the browser
 * (via `page.evaluate`) and in tests (via linkedom). These interfaces cover
 * only the read-only members those helpers touch, so the code stays lib-free
 * while remaining type-checked. linkedom and browser nodes both satisfy them.
 * @module interfaces/dom
 */

/** Read-only element surface used by DOM-walking heuristics. */
export interface DomElement {
  readonly tagName: string;
  readonly parentElement: DomElement | null;
  readonly children: { readonly length: number };
  readonly textContent: string | null;
  /** Present on anchors; the resolved absolute URL. */
  readonly href?: string;
  getAttribute(name: string): string | null;
  matches(selector: string): boolean;
  /** True when `other` is this element or a descendant of it. */
  contains(other: DomElement): boolean;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): Iterable<DomElement>;
}

/** Read-only document surface: just the query roots the heuristics need. */
export interface DomDocument {
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): Iterable<DomElement>;
}
