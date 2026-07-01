/**
 * RFC 6238 TOTP generation with zero dependencies (node:crypto only).
 * Accepts a raw base32 secret or an `otpauth://` URI.
 * @module vault/totp
 */
import { createHmac } from "node:crypto";

/** RFC 4648 base32 alphabet. */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Decode an RFC 4648 base32 string (case-insensitive, padding/space tolerant). */
function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[=\s]/g, "");
  if (!clean) throw new Error("Empty base32 TOTP secret.");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32 character in TOTP secret.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

/** Extract the base32 secret from an `otpauth://` URI, or return the input as-is. */
function extractSecret(source: string): string {
  if (!source.toLowerCase().startsWith("otpauth://")) return source.trim();
  const secret = new URL(source).searchParams.get("secret");
  if (!secret) throw new Error("otpauth:// URI is missing the `secret` parameter.");
  return secret;
}

/**
 * Generate the current TOTP code (RFC 6238, HMAC-SHA1).
 *
 * @param source - Raw base32 secret or `otpauth://` URI.
 * @param nowMs - Epoch milliseconds (defaults to now; injectable for tests).
 * @param digits - Number of output digits (default 6).
 * @param step - Time step in seconds (default 30).
 * @returns Zero-padded numeric code of length `digits`.
 */
export function totp(source: string, nowMs = Date.now(), digits = 6, step = 30): string {
  const key = base32Decode(extractSecret(source));
  const counter = Math.floor(nowMs / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", key).update(buf).digest();
  const offset = hash.readUInt8(hash.length - 1) & 0x0f;
  const bin = hash.readUInt32BE(offset) & 0x7fffffff;
  return (bin % 10 ** digits).toString().padStart(digits, "0");
}
