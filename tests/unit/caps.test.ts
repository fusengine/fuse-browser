import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { CAP_GROUPS, parseCaps } from "../../src/server/caps.js";

/** Silence the stderr report for unknown group names during these tests. */
const errSpy = spyOn(console, "error").mockImplementation(() => {});

afterEach(() => errSpy.mockClear());

describe("parseCaps", () => {
  test("undefined enables every group", () => {
    expect(parseCaps(undefined)).toEqual(new Set(CAP_GROUPS));
  });

  test("empty / blank string enables every group", () => {
    expect(parseCaps("")).toEqual(new Set(CAP_GROUPS));
    expect(parseCaps("  ,  ,")).toEqual(new Set(CAP_GROUPS));
  });

  test('"core,extract" enables exactly those two groups', () => {
    expect(parseCaps("core,extract")).toEqual(new Set(["core", "extract"]));
  });

  test("tolerates case and surrounding whitespace", () => {
    expect(parseCaps("  CORE , Extract ")).toEqual(new Set(["core", "extract"]));
  });

  test("ignores unknown names but keeps the known ones", () => {
    expect(parseCaps("core,bogus")).toEqual(new Set(["core"]));
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(String(errSpy.mock.calls[0]?.[0])).toContain('unknown FUSE_CAPS group "bogus"');
  });

  test("only unknown names falls back to every group", () => {
    expect(parseCaps("bogus,nope")).toEqual(new Set(CAP_GROUPS));
    expect(errSpy).toHaveBeenCalledTimes(2);
  });
});
