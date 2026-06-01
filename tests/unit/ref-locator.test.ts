import { describe, expect, test } from "bun:test";
import { parseRef } from "../../src/actions/ref-locator.js";

describe("parseRef", () => {
  test("bare value targets the main frame", () => {
    expect(parseRef("12")).toEqual({ frame: 0, local: "12" });
    expect(parseRef(7)).toEqual({ frame: 0, local: "7" });
  });

  test("frame-scoped ref splits frame and local index", () => {
    expect(parseRef("3:4")).toEqual({ frame: 3, local: "4" });
    expect(parseRef("10:0")).toEqual({ frame: 10, local: "0" });
  });
});
