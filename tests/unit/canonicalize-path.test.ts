import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalizePath } from "../../src/lib/canonicalize-path.js";

/** `mkdtempSync(tmpdir())` on macOS returns a path through `/var`, itself a
 * symlink to `/private/var` — `canonicalizePath` correctly resolves that
 * ancestor symlink too, so test fixtures must start from the already
 * fully-resolved base to compare like with like. */
function freshBase(prefix: string): string {
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}

// Regression for the LIVE-REPRODUCED escape: `resolve(path)` used to collapse
// `..` LEXICALLY before any `lstat` walk, so `root/livedir/../outside2/x.png`
// (where `livedir` is a symlink OUT of the root) canonicalized to a path
// still INSIDE the root, while the kernel actually resolved it outside. These
// tests call `canonicalizePath` directly (not through `checkWriteConfinement`,
// which also has its own outright `..`-segment rejection) to prove the
// algorithm itself is now symlink-safe, independent of that second layer.
describe("canonicalizePath — symlink-then-`..` escape (the live-reproduced bypass)", () => {
  test("root/livedir/../outside2/x.png resolves OUTSIDE the root when livedir -> outside", () => {
    const base = freshBase("fuse-canon-");
    const root = join(base, "root");
    const outside = join(base, "outside");
    const outside2 = join(base, "outside2");
    mkdirSync(root);
    mkdirSync(outside);
    mkdirSync(outside2);
    symlinkSync(outside, join(root, "livedir"));
    const escaped = `${join(root, "livedir")}/../outside2/x.png`;
    const resolved = canonicalizePath(escaped);
    expect(resolved).toBe(join(outside2, "x.png"));
    expect(resolved.startsWith(root)).toBe(false);
  });

  test("a live symlink to an outside FILE as the FINAL path component resolves to that file", () => {
    const base = freshBase("fuse-canon-");
    const root = join(base, "root");
    const outside = join(base, "outside");
    mkdirSync(root);
    mkdirSync(outside);
    const realFile = join(outside, "real.png");
    writeFileSync(realFile, "x");
    symlinkSync(realFile, join(root, "shot.png"));
    expect(canonicalizePath(join(root, "shot.png"))).toBe(realFile);
  });

  test("an inside -> inside symlink resolves to the real inside path (no over-block)", () => {
    const base = freshBase("fuse-canon-");
    const root = join(base, "root");
    const innerReal = join(root, "real-sub");
    mkdirSync(root);
    mkdirSync(innerReal);
    symlinkSync(innerReal, join(root, "alias"));
    expect(canonicalizePath(join(root, "alias", "shot.png"))).toBe(join(innerReal, "shot.png"));
  });

  test("a dangling symlinked parent that escapes the root still resolves outside (non-existent tail honors `..` too)", () => {
    const base = freshBase("fuse-canon-");
    const root = join(base, "root");
    const outside = join(base, "outside");
    mkdirSync(root);
    mkdirSync(outside);
    symlinkSync(join(outside, "not-there-yet"), join(root, "escape"));
    const resolved = canonicalizePath(`${join(root, "escape")}/../sibling/x.png`);
    expect(resolved).toBe(join(outside, "sibling", "x.png"));
  });

  test("a symlink cycle throws instead of silently continuing (ELOOP-style rejection)", () => {
    const base = freshBase("fuse-canon-");
    const a = join(base, "a");
    const b = join(base, "b");
    symlinkSync(b, a);
    symlinkSync(a, b);
    expect(() => canonicalizePath(a)).toThrow();
  });
});
