/**
 * PNG pixel diff via fast-png (decode/encode) + pixelmatch — pure JS, no native
 * build. Returns diff stats, changed-region boxes and the highlighted diff PNG.
 * Throws `dimension_mismatch` when sizes differ (no silent resize).
 * @module lib/pixel-diff
 */
import { decode, encode } from "fast-png";
import pixelmatch from "pixelmatch";
import { computeDiffRegions, type DiffRegion } from "./diff-regions.js";

/** Decoded PNG, channel count varies (gray/ga/rgb/rgba), depth 1..16. */
interface Decoded {
  width: number;
  height: number;
  data: ArrayLike<number>;
  channels: number;
  depth: number;
}

/**
 * Normalize any channel/depth layout to packed 8-bit RGBA (alpha defaults to
 * 255). 16-bit samples are scaled down to 8-bit so pixelmatch sees byte values.
 */
function toRgba(img: Decoded): Uint8Array {
  const { width, height, data, channels, depth } = img;
  const scale = (v: number): number => (depth === 16 ? v >> 8 : v);
  if (channels === 4 && depth === 8) return data as Uint8Array;
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const g = scale(data[i * channels] ?? 0);
    out[i * 4] = channels >= 3 ? scale(data[i * channels] ?? 0) : g;
    out[i * 4 + 1] = channels >= 3 ? scale(data[i * channels + 1] ?? 0) : g;
    out[i * 4 + 2] = channels >= 3 ? scale(data[i * channels + 2] ?? 0) : g;
    out[i * 4 + 3] =
      channels === 2 ? scale(data[i * channels + 1] ?? 255) : channels === 4 ? scale(data[i * channels + 3] ?? 255) : 255;
  }
  return out;
}

/** Result of comparing two PNG buffers. */
export interface PixelDiff {
  width: number;
  height: number;
  diffPixels: number;
  diffRatio: number;
  regions: DiffRegion[];
  diffPng: Uint8Array;
}

/** Compare two PNG buffers; `threshold` is pixelmatch's color tolerance (0..1). */
export function diffPng(baseline: Uint8Array, current: Uint8Array, threshold = 0.1): PixelDiff {
  const a = decode(baseline);
  const b = decode(current);
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`dimension_mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }
  const { width, height } = a;
  const out = new Uint8Array(width * height * 4);
  // Playwright PNGs are often RGB (no alpha); normalize both to packed RGBA.
  const diffPixels = pixelmatch(toRgba(a), toRgba(b), out, width, height, { threshold, includeAA: false });
  return {
    width,
    height,
    diffPixels,
    diffRatio: width * height ? diffPixels / (width * height) : 0,
    regions: computeDiffRegions(out, width, height),
    diffPng: encode({ width, height, data: out }),
  };
}
