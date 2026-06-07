import { describe, expect, test } from "bun:test";
import type { ImpitResponse } from "impit";
import { readCappedText } from "../../src/net/read-body.js";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

/** Minimal ImpitResponse double: a chunked body stream + utf-8 decodeBuffer. */
function fakeRes(chunks: Uint8Array[]): ImpitResponse {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return {
    body: stream,
    decodeBuffer: (buf: Buffer) => buf.toString("utf-8"),
  } as unknown as ImpitResponse;
}

describe("readCappedText", () => {
  test("returns the full body when under the cap", async () => {
    const res = fakeRes([enc("hello "), enc("world")]);
    expect(await readCappedText(res, 1000)).toBe("hello world");
  });

  test("hard-truncates to the byte cap and stops reading early", async () => {
    const res = fakeRes([enc("aaaa"), enc("bbbb"), enc("cccc")]);
    // cap 6 → first chunk (4) accepted, second (total 8) hits cap → truncated to 6.
    expect(await readCappedText(res, 6)).toBe("aaaabb");
  });

  test("empty body yields empty string", async () => {
    expect(await readCappedText(fakeRes([]), 1000)).toBe("");
  });

  test("truncation backs off a split multi-byte char (no U+FFFD)", async () => {
    // "abcd" + "é" (0xC3 0xA9). cap 5 cuts after 0xC3 → drop the dangling lead.
    const res = fakeRes([enc("abcd"), new Uint8Array([0xc3, 0xa9])]);
    const out = await readCappedText(res, 5);
    expect(out).toBe("abcd");
    expect(out).not.toContain("�");
  });

  test("a complete trailing char at the cap is preserved", async () => {
    // "abc" + "é" = 5 bytes exactly; cap 5 keeps the whole char.
    const res = fakeRes([enc("abc"), new Uint8Array([0xc3, 0xa9])]);
    expect(await readCappedText(res, 5)).toBe("abcé");
  });
});
