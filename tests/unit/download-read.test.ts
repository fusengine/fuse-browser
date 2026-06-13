import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_READ_BYTES, readDownload } from "../../src/session/download-read.js";
import type { DownloadRecord } from "../../src/session/downloads.js";

const dir = mkdtempSync(join(tmpdir(), "dl-read-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Write a file in the temp dir and return a matching DownloadRecord. */
function record(name: string, bytes: Buffer | string): DownloadRecord {
  const path = join(dir, name);
  writeFileSync(path, bytes);
  return { url: `http://x/${name}`, suggestedFilename: name, path, at: Date.now() };
}

describe("readDownload", () => {
  const text = record("note.txt", "héllo world");
  const bin = record("blob.bin", Buffer.from([0x00, 0xff, 0x10]));
  const records = [text, bin];

  test("reads utf8 by index", () => {
    const out = readDownload(records, 0, "utf8");
    expect(out).toEqual({ filename: "note.txt", encoding: "utf8", data: "héllo world" });
  });

  test("reads base64 by filename", () => {
    const out = readDownload(records, "blob.bin", "base64");
    expect(out).toEqual({
      filename: "blob.bin",
      encoding: "base64",
      data: Buffer.from([0x00, 0xff, 0x10]).toString("base64"),
    });
  });

  test("defaults to utf8", () => {
    const out = readDownload(records, 0);
    expect("data" in out && out.encoding).toBe("utf8");
  });

  test("invalid index → error", () => {
    expect(readDownload(records, 9)).toEqual({ error: expect.stringContaining("No download") });
  });

  test("unknown filename → error", () => {
    expect(readDownload(records, "nope.txt")).toEqual({
      error: expect.stringContaining("No download"),
    });
  });

  test("missing file on disk → error", () => {
    const ghost: DownloadRecord = {
      url: "http://x/gone",
      suggestedFilename: "gone.txt",
      path: join(dir, "gone.txt"),
      at: Date.now(),
    };
    expect(readDownload([ghost], 0)).toEqual({ error: expect.stringContaining("no file on disk") });
  });

  test("record with empty path → error", () => {
    const pending: DownloadRecord = {
      url: "http://x/p",
      suggestedFilename: "p.txt",
      path: "",
      at: Date.now(),
    };
    expect(readDownload([pending], 0)).toEqual({ error: expect.stringContaining("no file") });
  });

  test("file over the size cap → error", () => {
    const big = record("big.bin", Buffer.alloc(MAX_READ_BYTES + 1));
    expect(readDownload([big], 0)).toEqual({ error: expect.stringContaining("read cap") });
  });
});
