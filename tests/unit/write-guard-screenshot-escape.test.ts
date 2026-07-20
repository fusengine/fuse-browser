import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeScreenshotOrError } from "../../src/server/tools/screenshot-write.js";

// Regression for the LIVE-REPRODUCED security-gate bypass (bytes landed
// OUTSIDE `FUSE_CONFINE_WRITES`): `canonicalizePath` used to collapse `..`
// LEXICALLY (via `node:path#resolve`) before any `lstat` walk, so
// `root/livedir/../outside2/x.png` (where `livedir` is a symlink OUT of the
// root) validated as inside the root while the kernel actually resolved it
// outside. Split out of write-guard-screenshot-real-path.test.ts to stay
// under the project's 100-line file limit.
const ORIGINAL = process.env.FUSE_CONFINE_WRITES;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FUSE_CONFINE_WRITES;
  else process.env.FUSE_CONFINE_WRITES = ORIGINAL;
});

describe("writeScreenshotOrError — symlink-then-`..` escape, real entry point", () => {
  test("a live symlink to an OUTSIDE FILE as the final component is blocked (previously untested at this entry point)", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-root-"));
    const outside = mkdtempSync(join(tmpdir(), "fuse-real-outside-"));
    const outsideFile = join(outside, "existing.png");
    writeFileSync(outsideFile, "already-here");
    const link = join(root, "shot.png");
    symlinkSync(outsideFile, link);
    process.env.FUSE_CONFINE_WRITES = root;
    const rejection = writeScreenshotOrError(link, Buffer.from("x"), "image/png");
    expect(rejection?.code).toBe("path_outside_confinement");
  });

  test("LIVE-REPRODUCED escape: root/livedir/../outside2/x.png (livedir -> outside) is blocked, and no file lands outside the root", () => {
    const base = mkdtempSync(join(tmpdir(), "fuse-real-repro-"));
    const root = join(base, "root");
    const outside = join(base, "outside");
    const outside2 = join(base, "outside2");
    mkdirSync(root);
    mkdirSync(outside);
    mkdirSync(outside2);
    symlinkSync(outside, join(root, "livedir"));
    process.env.FUSE_CONFINE_WRITES = root;
    const escapedTarget = `${join(root, "livedir")}/../outside2/x.png`;
    const rejection = writeScreenshotOrError(escapedTarget, Buffer.from("x"), "image/png");
    expect(rejection?.code).toBe("path_outside_confinement");
    expect(existsSync(join(outside2, "x.png"))).toBe(false);
  });
});
