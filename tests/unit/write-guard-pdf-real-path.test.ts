import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writePdfOrError } from "../../src/server/tools/pdf-write.js";

// Same regression class as write-guard-screenshot-real-path.test.ts, exercised
// through the `browser_pdf` real entry point (`writePdfOrError`) instead.
const ORIGINAL = process.env.FUSE_CONFINE_WRITES;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FUSE_CONFINE_WRITES;
  else process.env.FUSE_CONFINE_WRITES = ORIGINAL;
});

describe("writePdfOrError — real entry point, FUSE_CONFINE_WRITES=<root>", () => {
  test("legit .pdf path inside the root is allowed and the bytes are actually written to disk", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-pdf-root-"));
    process.env.FUSE_CONFINE_WRITES = root;
    const target = join(root, "sub", "out.pdf");
    const data = Buffer.from("PDFDATA");
    expect(writePdfOrError(target, data)).toBeUndefined();
    expect(readFileSync(target)).toEqual(data);
  });

  test("a dangling symlink as the FINAL component is blocked at write time (O_NOFOLLOW / TOCTOU close)", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-pdf-root-"));
    const link = join(root, "out.pdf");
    symlinkSync(join(root, "not-created-yet.pdf"), link);
    process.env.FUSE_CONFINE_WRITES = root;
    const rejection = writePdfOrError(link, Buffer.from("x"));
    expect(rejection?.code).toBe("path_outside_confinement");
  });

  test("prefix collision: a root `/a`-like dir does not accept a sibling `/ab`-like dir", () => {
    const parent = mkdtempSync(join(tmpdir(), "fuse-real-pdf-parent-"));
    const root = join(parent, "a");
    const sibling = join(parent, "ab");
    mkdirSync(root);
    mkdirSync(sibling);
    process.env.FUSE_CONFINE_WRITES = root;
    const rejection = writePdfOrError(join(sibling, "x", "out.pdf"), Buffer.from("x"));
    expect(rejection?.code).toBe("path_outside_confinement");
  });

  test("non-.pdf extension is still rejected before any write is attempted", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-pdf-root-"));
    process.env.FUSE_CONFINE_WRITES = root;
    expect(writePdfOrError(join(root, "out.txt"), Buffer.from("x"))?.code).toBe("path_extension_mismatch");
  });
});
