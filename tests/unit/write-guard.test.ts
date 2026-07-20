import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWriteConfinement } from "../../src/lib/write-guard.js";

// AJOUT 1 regression coverage: FUSE_CONFINE_WRITES, opt-in, byte-identical off.
const ORIGINAL = process.env.FUSE_CONFINE_WRITES;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FUSE_CONFINE_WRITES;
  else process.env.FUSE_CONFINE_WRITES = ORIGINAL;
});

describe("checkWriteConfinement — OFF by default (byte-identical)", () => {
  test("unset env: any path is accepted, including outside any notion of a root", () => {
    delete process.env.FUSE_CONFINE_WRITES;
    expect(checkWriteConfinement("/tmp/anywhere/page.pdf")).toBeUndefined();
    expect(checkWriteConfinement("/etc/passwd")).toBeUndefined();
  });
});

describe("checkWriteConfinement — ON (FUSE_CONFINE_WRITES=<root>)", () => {
  test("legitimate path inside the root (parent dirs need not exist yet) is accepted", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-guard-root-"));
    process.env.FUSE_CONFINE_WRITES = root;
    expect(checkWriteConfinement(join(root, "sub", "dir", "shot.png"))).toBeUndefined();
  });

  test("absolute path outside the root is rejected", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-guard-root-"));
    process.env.FUSE_CONFINE_WRITES = root;
    const err = checkWriteConfinement("/tmp/completely/different/shot.png");
    expect(err).toBeDefined();
    expect(err).toContain("outside the confined root");
  });

  test("a `..` escape out of the root is rejected", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-guard-root-"));
    process.env.FUSE_CONFINE_WRITES = root;
    const err = checkWriteConfinement(join(root, "..", "escaped.png"));
    expect(err).toBeDefined();
  });

  test("a symlinked parent that escapes the root is rejected (not just a literal `..`)", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-guard-root-"));
    const outside = mkdtempSync(join(tmpdir(), "fuse-guard-outside-"));
    const link = join(root, "escape");
    symlinkSync(outside, link);
    process.env.FUSE_CONFINE_WRITES = root;
    const err = checkWriteConfinement(join(link, "shot.png"));
    expect(err).toBeDefined();
  });

  test("a symlinked parent that stays inside the root is accepted", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-guard-root-"));
    const innerReal = join(root, "real-sub");
    mkdirSync(innerReal);
    const link = join(root, "alias");
    symlinkSync(innerReal, link);
    process.env.FUSE_CONFINE_WRITES = root;
    expect(checkWriteConfinement(join(link, "shot.png"))).toBeUndefined();
  });

  test("a DANGLING symlinked parent (target does not exist) that resolves outside the root is rejected", () => {
    const root = mkdtempSync(join(tmpdir(), "fuse-guard-root-"));
    const outside = mkdtempSync(join(tmpdir(), "fuse-guard-outside-"));
    const danglingTarget = join(outside, "does-not-exist-yet");
    const link = join(root, "dangling-escape");
    symlinkSync(danglingTarget, link);
    process.env.FUSE_CONFINE_WRITES = root;
    const err = checkWriteConfinement(join(link, "shot.png"));
    expect(err).toBeDefined();
  });

  test("root=\"/\" is handled as the filesystem root (no double-slash prefix bug): any absolute path validates", () => {
    const someTmpFile = join(mkdtempSync(join(tmpdir(), "fuse-guard-root-slash-")), "shot.png");
    process.env.FUSE_CONFINE_WRITES = "/";
    expect(checkWriteConfinement(someTmpFile)).toBeUndefined();
  });

  test("prefix collision: root `/a`-like dir does not accept a sibling `/ab`-like dir", () => {
    const parent = mkdtempSync(join(tmpdir(), "fuse-guard-parent-"));
    const root = join(parent, "a");
    const sibling = join(parent, "ab");
    mkdirSync(root);
    mkdirSync(sibling);
    process.env.FUSE_CONFINE_WRITES = root;
    const err = checkWriteConfinement(join(sibling, "x", "shot.png"));
    expect(err).toBeDefined();
  });
});
