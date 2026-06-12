import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { normalizeFiles, setFiles, uploadFiles } from "../../src/actions/upload.js";

/** A file-input locator stub recording the paths passed to setInputFiles. */
function makeLocator(): { locator: Locator; calls: unknown[] } {
  const calls: unknown[] = [];
  const self = {
    first: () => self,
    setInputFiles: async (paths: unknown) => {
      calls.push(paths);
    },
  };
  return { locator: self as unknown as Locator, calls };
}

/** A locator whose setInputFiles always throws (e.g. not a file input). */
function makeFailingLocator(): Locator {
  const self = {
    first: () => self,
    setInputFiles: async () => {
      throw new Error("Element is not an <input>\nstack");
    },
  };
  return self as unknown as Locator;
}

describe("normalizeFiles", () => {
  test("wraps a single path", () => {
    expect(normalizeFiles("/tmp/cv.pdf")).toEqual(["/tmp/cv.pdf"]);
  });

  test("splits a comma-separated string and trims", () => {
    expect(normalizeFiles("/a.png, /b.png ,/c.png")).toEqual(["/a.png", "/b.png", "/c.png"]);
  });

  test("keeps an explicit array, dropping blanks", () => {
    expect(normalizeFiles(["/a.png", "", "  ", "/b.png"])).toEqual(["/a.png", "/b.png"]);
  });
});

describe("setFiles", () => {
  test("calls setInputFiles with the normalized paths", async () => {
    const { locator, calls } = makeLocator();
    const r = await setFiles(locator, "/tmp/cv.pdf");
    expect(r.ok).toBe(true);
    expect(r.files).toEqual(["/tmp/cv.pdf"]);
    expect(calls).toEqual([["/tmp/cv.pdf"]]);
  });

  test("multi-file via CSV passes every path", async () => {
    const { locator, calls } = makeLocator();
    const r = await setFiles(locator, "/a.png,/b.png");
    expect(r.ok).toBe(true);
    expect(r.files).toEqual(["/a.png", "/b.png"]);
    expect(calls).toEqual([["/a.png", "/b.png"]]);
  });

  test("returns no_files when nothing usable is given", async () => {
    const { locator, calls } = makeLocator();
    const r = await setFiles(locator, "  ");
    expect(r).toEqual({ type: "upload", ok: false, error: "no_files" });
    expect(calls).toEqual([]);
  });

  test("captures a single-line error when the element is not a file input", async () => {
    const r = await setFiles(makeFailingLocator(), "/tmp/cv.pdf");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Error: Element is not an <input>");
  });
});

describe("uploadFiles", () => {
  test("resolves the target and tags the result", async () => {
    const { locator, calls } = makeLocator();
    const page = { locator: () => locator } as unknown as Page;
    const r = await uploadFiles(page, "input[type=file]", ["/a.pdf", "/b.pdf"]);
    expect(r.ok).toBe(true);
    expect(r.target).toBe("input[type=file]");
    expect(calls).toEqual([["/a.pdf", "/b.pdf"]]);
  });

  test("fails without touching the page when target is empty", async () => {
    let touched = false;
    const page = {
      locator: () => {
        touched = true;
        return null as unknown as Locator;
      },
    } as unknown as Page;
    const r = await uploadFiles(page, "", "/a.pdf");
    expect(r).toEqual({ type: "upload", ok: false, error: "no_target" });
    expect(touched).toBe(false);
  });
});
