import { describe, expect, test } from "bun:test";
import { isAbsolute, resolve } from "node:path";
import { assertPngPath } from "../../src/lib/safe-png.js";

describe("assertPngPath", () => {
  test("resolves a relative .png path to an absolute one", () => {
    const out = assertPngPath("shots/page.png", "a");
    expect(out).toBe(resolve("shots/page.png"));
    expect(isAbsolute(out)).toBe(true);
  });

  test("keeps an absolute .png path (normalized)", () => {
    expect(assertPngPath("/tmp/x//shots/../base.png", "baseline")).toBe(resolve("/tmp/x/base.png"));
  });

  test("accepts uppercase .PNG extension", () => {
    expect(assertPngPath("/tmp/SHOT.PNG", "b")).toBe(resolve("/tmp/SHOT.PNG"));
  });

  test("rejects an empty string", () => {
    expect(() => assertPngPath("", "a")).toThrow(/a: path must be a non-empty string/);
  });

  test("rejects a non-.png extension", () => {
    expect(() => assertPngPath("/tmp/file.txt", "b")).toThrow(/b: path must end with \.png/);
  });

  test("rejects a path containing a NUL character", () => {
    expect(() => assertPngPath("/tmp/evil\0.png", "baseline")).toThrow(/baseline: path must not contain NUL/);
  });
});
