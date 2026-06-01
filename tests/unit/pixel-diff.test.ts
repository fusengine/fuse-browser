import { describe, expect, test } from "bun:test";
import { encode } from "fast-png";
import { computeDiffRegions } from "../../src/lib/diff-regions.js";
import { diffPng } from "../../src/lib/pixel-diff.js";

/** Build a solid RGBA PNG buffer of `w`x`h` filled with [r,g,b,255]. */
function png(w: number, h: number, r: number, g: number, b: number): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([r, g, b, 255], i * 4);
  return encode({ width: w, height: h, data });
}

describe("diffPng", () => {
  test("identical images → zero diff", () => {
    const a = png(32, 32, 255, 255, 255);
    const d = diffPng(a, a);
    expect(d.diffPixels).toBe(0);
    expect(d.regions.length).toBe(0);
  });

  test("fully different images → all pixels differ, one region", () => {
    const d = diffPng(png(32, 32, 255, 255, 255), png(32, 32, 0, 0, 0));
    expect(d.diffPixels).toBe(32 * 32);
    expect(d.diffRatio).toBe(1);
    expect(d.regions.length).toBe(1);
  });

  test("throws on dimension mismatch", () => {
    expect(() => diffPng(png(16, 16, 0, 0, 0), png(32, 32, 0, 0, 0))).toThrow(/dimension_mismatch/);
  });
});

describe("computeDiffRegions", () => {
  test("groups a red cluster into one bounding box", () => {
    const w = 64;
    const h = 64;
    const mask = new Uint8Array(w * h * 4);
    for (let y = 20; y < 30; y++) for (let x = 20; x < 30; x++) mask[(y * w + x) * 4] = 255; // red
    const regions = computeDiffRegions(mask, w, h);
    expect(regions.length).toBe(1);
    expect(regions[0]?.x).toBeLessThanOrEqual(20);
    expect(regions[0]?.y).toBeLessThanOrEqual(20);
  });
});
