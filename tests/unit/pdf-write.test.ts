import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePdfPath } from "../../src/server/tools/pdf-write.js";

// P2 regression coverage: browser_pdf now gates the `.pdf` extension, and
// optionally confines the path under FUSE_CONFINE_WRITES (off by default).
const ORIGINAL_CONFINE = process.env.FUSE_CONFINE_WRITES;
afterEach(() => {
  if (ORIGINAL_CONFINE === undefined) delete process.env.FUSE_CONFINE_WRITES;
  else process.env.FUSE_CONFINE_WRITES = ORIGINAL_CONFINE;
});

describe("validatePdfPath — extension gate (P2 fix)", () => {
  test("wrong extension -> path_extension_mismatch", () => {
    delete process.env.FUSE_CONFINE_WRITES;
    expect(validatePdfPath("/tmp/out.txt")?.code).toBe("path_extension_mismatch");
  });

  test(".pdf extension is accepted when confinement is off (default, byte-identical)", () => {
    delete process.env.FUSE_CONFINE_WRITES;
    expect(validatePdfPath("/tmp/anywhere-fuse-test/out.pdf")).toBeUndefined();
  });
});

describe("validatePdfPath — FUSE_CONFINE_WRITES (opt-in)", () => {
  test("path inside the confined root is accepted", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-confine-"));
    process.env.FUSE_CONFINE_WRITES = root;
    expect(validatePdfPath(join(root, "sub", "out.pdf"))).toBeUndefined();
  });

  test("absolute path outside the root is rejected", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-confine-"));
    process.env.FUSE_CONFINE_WRITES = root;
    expect(validatePdfPath("/tmp/fuse-elsewhere/out.pdf")?.code).toBe("path_outside_confinement");
  });
});
