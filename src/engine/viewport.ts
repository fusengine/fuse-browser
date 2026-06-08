/**
 * Viewport presets and resolution for responsive screenshots.
 * @module engine/viewport
 */
import { VIEWPORT } from "./context.js";

/** Named device viewport presets (CSS pixels). */
export const VIEWPORT_PRESETS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: VIEWPORT.width, height: VIEWPORT.height },
} as const;

/** A viewport: a preset name or an explicit size. */
export type ViewportInput = keyof typeof VIEWPORT_PRESETS | { width: number; height: number };

/** Resolve a viewport input to concrete width/height. */
export function resolveViewport(input: ViewportInput): { width: number; height: number } {
  if (typeof input === "string") return { ...VIEWPORT_PRESETS[input] };
  return { width: input.width, height: input.height };
}

/** Human label for a viewport (preset name or `WxH`). */
export function viewportLabel(input: ViewportInput): string {
  const { width, height } = resolveViewport(input);
  return `${typeof input === "string" ? input : "custom"} ${width}x${height}`;
}

/**
 * Parse a `--viewports`-style CSV (`"mobile,desktop,1280x720"`) into viewport
 * inputs. Unknown tokens fall back to `desktop`. Empty input → `mobile,desktop`.
 *
 * @param csv - Comma-separated presets and/or `WIDTHxHEIGHT` sizes.
 * @returns The parsed viewport list.
 */
export function parseViewports(csv: string | undefined): ViewportInput[] {
  const presets = Object.keys(VIEWPORT_PRESETS);
  return (csv ?? "mobile,desktop")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p): ViewportInput => {
      if (presets.includes(p)) return p as ViewportInput;
      const [w, h] = p.split("x").map(Number);
      return Number.isFinite(w) && Number.isFinite(h) ? { width: w as number, height: h as number } : "desktop";
    });
}
