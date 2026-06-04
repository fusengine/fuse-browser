import { describe, expect, test } from "bun:test";
import { contrastRatio, parseCssColor, wcagLevel } from "../../src/lib/contrast.js";

describe("parseCssColor", () => {
  test("rgb / rgba / hex / transparent", () => {
    expect(parseCssColor("rgb(255, 255, 255)")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseCssColor("rgba(0,0,0,0.5)")).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseCssColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseCssColor("transparent")).toBeNull();
  });
});

describe("contrastRatio", () => {
  test("black on white = 21:1", () => {
    expect(Math.round(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }))).toBe(21);
  });
  test("identical colors = 1:1", () => {
    expect(contrastRatio({ r: 10, g: 20, b: 30 }, { r: 10, g: 20, b: 30 })).toBe(1);
  });
});

describe("wcagLevel", () => {
  test("normal-text thresholds (AA 4.5 / AAA 7)", () => {
    expect(wcagLevel(4.5, false)).toMatchObject({ AA: true, AAA: false });
    expect(wcagLevel(7, false)).toMatchObject({ AA: true, AAA: true });
    expect(wcagLevel(3, false)).toMatchObject({ AA: false, AAA: false });
  });
  test("large-text relaxed thresholds (AA 3 / AAA 4.5)", () => {
    expect(wcagLevel(3, true)).toMatchObject({ AA: true, AAA: false });
    expect(wcagLevel(4.5, true)).toMatchObject({ AA: true, AAA: true });
  });
});
