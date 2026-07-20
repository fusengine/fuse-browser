import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeScreenshotOrError } from "../../src/server/tools/screenshot-write.js";

// Regression: the 512-test suite missed the write-path bypass because every
// prior test exercised `checkWriteConfinement` in isolation. These exercise
// the REAL tool entry point (`writeScreenshotOrError`), which both validates
// AND performs the write via `writeConfinedBytes` (O_NOFOLLOW / TOCTOU fix).
const ORIGINAL = process.env.FUSE_CONFINE_WRITES;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FUSE_CONFINE_WRITES;
  else process.env.FUSE_CONFINE_WRITES = ORIGINAL;
});

describe("writeScreenshotOrError — real entry point, FUSE_CONFINE_WRITES=<root>", () => {
  test("legit path inside the root is allowed and the bytes are actually written to disk", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-root-"));
    process.env.FUSE_CONFINE_WRITES = root;
    const target = join(root, "sub", "shot.png");
    const data = Buffer.from("PNGDATA");
    expect(writeScreenshotOrError(target, data, "image/png")).toBeUndefined();
    expect(readFileSync(target)).toEqual(data);
  });

  test("a dangling symlink as the FINAL component is blocked at write time even though its (nonexistent) target resolves inside the root — O_NOFOLLOW closes the TOCTOU window", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-root-"));
    const link = join(root, "shot.png");
    symlinkSync(join(root, "not-created-yet.png"), link);
    process.env.FUSE_CONFINE_WRITES = root;
    const rejection = writeScreenshotOrError(link, Buffer.from("x"), "image/png");
    expect(rejection?.code).toBe("path_outside_confinement");
  });

  test("a dangling symlinked PARENT directory that escapes the root is blocked", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-root-"));
    const outside = mkdtempSync(join(tmpdir(), "fuse-real-outside-"));
    const linkDir = join(root, "sub");
    symlinkSync(join(outside, "not-there-yet"), linkDir);
    process.env.FUSE_CONFINE_WRITES = root;
    const rejection = writeScreenshotOrError(join(linkDir, "shot.png"), Buffer.from("x"), "image/png");
    expect(rejection?.code).toBe("path_outside_confinement");
  });

  test("a live symlinked parent directory that escapes the root is blocked", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-root-"));
    const outside = mkdtempSync(join(tmpdir(), "fuse-real-outside-"));
    const linkDir = join(root, "sub");
    symlinkSync(outside, linkDir);
    process.env.FUSE_CONFINE_WRITES = root;
    const rejection = writeScreenshotOrError(join(linkDir, "shot.png"), Buffer.from("x"), "image/png");
    expect(rejection?.code).toBe("path_outside_confinement");
  });

  test("a `..` escape and an absolute-outside path are both blocked", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-real-root-"));
    process.env.FUSE_CONFINE_WRITES = root;
    expect(writeScreenshotOrError(join(root, "..", "escaped.png"), Buffer.from("x"), "image/png")?.code).toBe(
      "path_outside_confinement",
    );
    expect(writeScreenshotOrError("/tmp/fuse-real-elsewhere/shot.png", Buffer.from("x"), "image/png")?.code).toBe(
      "path_outside_confinement",
    );
  });

  test('root="/" is the filesystem root (no confinement in practice): a real write still succeeds', () => {
    process.env.FUSE_CONFINE_WRITES = "/";
    const target = join(mkdtempSync(join(tmpdir(), "fuse-real-slash-")), "shot.png");
    const data = Buffer.from("PNGDATA2");
    expect(writeScreenshotOrError(target, data, "image/png")).toBeUndefined();
    expect(readFileSync(target)).toEqual(data);
  });

  test("prefix collision: a root `/a`-like dir does not accept a sibling `/ab`-like dir", () => {
    const parent = mkdtempSync(join(tmpdir(), "fuse-real-parent-"));
    const root = join(parent, "a");
    const sibling = join(parent, "ab");
    mkdirSync(root);
    mkdirSync(sibling);
    process.env.FUSE_CONFINE_WRITES = root;
    const rejection = writeScreenshotOrError(join(sibling, "x", "shot.png"), Buffer.from("x"), "image/png");
    expect(rejection?.code).toBe("path_outside_confinement");
  });
});
