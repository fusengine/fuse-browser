/**
 * WCAG 2.x contrast ratio between two CSS colors. Pure, no DOM.
 * @module lib/contrast
 */

/** An sRGB color (0-255 per channel). */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `rgb()/rgba()/#rrggbb` into {@link Rgb}, or null (e.g. "transparent"). */
export function parseCssColor(value: string): Rgb | null {
  const m = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  const h = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (h) {
    const n = Number.parseInt(h[1] as string, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  return null;
}

/** WCAG relative luminance (0..1) of an sRGB color. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio (1..21) between two colors. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG pass levels for a ratio. `large` = ≥24px, or ≥18.66px bold. */
export function wcagLevel(ratio: number, large: boolean): { ratio: number; AA: boolean; AAA: boolean } {
  return {
    ratio: Math.round(ratio * 100) / 100,
    AA: ratio >= (large ? 3 : 4.5),
    AAA: ratio >= (large ? 4.5 : 7),
  };
}
