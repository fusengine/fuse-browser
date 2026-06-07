/**
 * Bounded response-body reader. Streams an {@link ImpitResponse} body and stops
 * once a byte cap is reached — so a single huge (or hostile) payload can't be
 * buffered unbounded. impit yields an already-decompressed body (reqwest strips
 * content-encoding), so the partial bytes only need charset decoding, which
 * `res.decodeBuffer` does — matching what `.text()` would have produced.
 * @module net/read-body
 */
import type { ImpitResponse } from "impit";

/**
 * Drop a trailing, incomplete UTF-8 multi-byte sequence from a hard-cut buffer.
 * When the cap slices the body mid-character the dangling bytes would decode to
 * U+FFFD; trimming them yields valid UTF-8. Applied only on truncation, so a
 * non-UTF-8 charset at worst loses ≤3 trailing bytes of an already-clipped 10 MB
 * body — negligible. A complete sequence is returned unchanged.
 */
function dropPartialTrailingUtf8(buf: Buffer): Buffer {
  let i = buf.length - 1;
  while (i >= 0 && ((buf[i] ?? 0) & 0xc0) === 0x80) i--; // skip continuation bytes
  if (i < 0) return buf;
  const lead = buf[i] ?? 0;
  const needed = (lead & 0x80) === 0 ? 1 : (lead & 0xe0) === 0xc0 ? 2 : (lead & 0xf0) === 0xe0 ? 3 : (lead & 0xf8) === 0xf0 ? 4 : 0;
  if (needed === 0) return buf; // invalid lead byte — leave as-is
  return buf.length - i < needed ? buf.subarray(0, i) : buf;
}

/**
 * Read at most `maxBytes` of the `res` body, charset-decoded to a string.
 *
 * @param res - The impit response to drain.
 * @param maxBytes - Hard cap; the stream is cancelled once reached so the
 *   download stops early instead of materializing the whole body.
 * @returns The decoded body, truncated to `maxBytes` on a clean UTF-8 boundary.
 */
export async function readCappedText(res: ImpitResponse, maxBytes: number): Promise<string> {
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.length;
    if (total >= maxBytes) {
      await reader.cancel();
      break;
    }
  }
  if (total <= maxBytes) return res.decodeBuffer(Buffer.concat(chunks, total));
  // Truncated: hard-cut to the cap, then back off any split trailing char.
  return res.decodeBuffer(dropPartialTrailingUtf8(Buffer.concat(chunks, maxBytes)));
}
