import { describe, expect, test } from "bun:test";
import { parseViewports, resolveViewport } from "../../src/engine/viewport.js";

describe("parseViewports", () => {
  test("defaults to mobile,desktop when empty", () => {
    expect(parseViewports(undefined)).toEqual(["mobile", "desktop"]);
  });

  test("parses presets and explicit WxH sizes", () => {
    expect(parseViewports("mobile, tablet, 1280x720")).toEqual([
      "mobile",
      "tablet",
      { width: 1280, height: 720 },
    ]);
  });

  test("unknown tokens fall back to desktop", () => {
    expect(parseViewports("nope,bad")).toEqual(["desktop", "desktop"]);
  });

  test("resolveViewport returns concrete sizes for presets and customs", () => {
    expect(resolveViewport("mobile")).toEqual({ width: 390, height: 844 });
    expect(resolveViewport({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });
});
