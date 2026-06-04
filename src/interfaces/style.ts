/**
 * Computed-style report for one element (design inspection).
 * @module interfaces/style
 */

/** Computed styles, box model and WCAG text-contrast for one element. */
export interface StyleReport {
  ref: string;
  box: { x: number; y: number; width: number; height: number };
  font: { family: string; size: string; weight: string; lineHeight: string };
  color: string;
  background: string;
  padding: string;
  margin: string;
  border: string;
  /** WCAG text contrast (color vs effective background); null if colors unparseable. */
  contrast: { ratio: number; AA: boolean; AAA: boolean } | null;
}
