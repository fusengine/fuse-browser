import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveDefaultOutputDir } from "../../src/lib/output-dir.js";

const withTempRoot = (fn: (root: string) => void): void => {
  const root = mkdtempSync(join(tmpdir(), "fb-out-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

describe("resolveDefaultOutputDir", () => {
  test("nests under a detected agent dir (.claude)", () => {
    withTempRoot((root) => {
      mkdirSync(join(root, ".claude"));
      expect(resolveDefaultOutputDir(root, "/home/x")).toBe(join(root, ".claude", "fuse-browser"));
    });
  });

  test("prefers .claude over .cursor when both exist", () => {
    withTempRoot((root) => {
      mkdirSync(join(root, ".cursor"));
      mkdirSync(join(root, ".claude"));
      expect(resolveDefaultOutputDir(root, "/home/x")).toBe(join(root, ".claude", "fuse-browser"));
    });
  });

  test("detects .cursor when .claude is absent", () => {
    withTempRoot((root) => {
      mkdirSync(join(root, ".cursor"));
      expect(resolveDefaultOutputDir(root, "/home/x")).toBe(join(root, ".cursor", "fuse-browser"));
    });
  });

  test("falls back to home/.fuse-browser when no agent dir", () => {
    withTempRoot((root) => {
      expect(resolveDefaultOutputDir(root, "/home/x")).toBe(join("/home/x", ".fuse-browser"));
    });
  });
});
