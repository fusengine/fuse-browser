import { describe, expect, test } from "bun:test";
import { cubicBezier, easeInOutCubic } from "../../src/actions/human-mouse.js";

const P0 = { x: 0, y: 0 };
const P1 = { x: 10, y: 40 };
const P2 = { x: 30, y: 40 };
const P3 = { x: 40, y: 0 };

describe("cubicBezier", () => {
  test("t=0 returns the start point", () => {
    expect(cubicBezier(0, P0, P1, P2, P3)).toEqual(P0);
  });

  test("t=1 returns the end point", () => {
    expect(cubicBezier(1, P0, P1, P2, P3)).toEqual(P3);
  });

  test("t=0.5 stays within the control hull and is the symmetric midpoint x", () => {
    const m = cubicBezier(0.5, P0, P1, P2, P3);
    expect(m.x).toBeCloseTo(20, 5); // symmetric control points → x = 20
    expect(m.y).toBeGreaterThan(0); // bowed upward by the controls
    expect(m.y).toBeLessThan(40);
  });
});

describe("easeInOutCubic", () => {
  test("pins 0, 1 and 0.5", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });

  test("is monotonic increasing", () => {
    let prev = -1;
    for (let i = 0; i <= 10; i += 1) {
      const v = easeInOutCubic(i / 10);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
