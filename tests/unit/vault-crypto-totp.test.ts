import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt } from "../../src/vault/crypto.js";
import { totp } from "../../src/vault/totp.js";

const KEY = randomBytes(32);

describe("vault crypto (AES-256-GCM)", () => {
  test("encrypt → decrypt round-trips UTF-8", () => {
    const blob = encrypt('{"a":1}', KEY);
    expect(blob.alg).toBe("aes-256-gcm");
    expect(decrypt(blob, KEY)).toBe('{"a":1}');
  });

  test("a fresh IV is used on every write", () => {
    expect(encrypt("x", KEY).iv).not.toBe(encrypt("x", KEY).iv);
  });

  test("tampered ciphertext fails authentication", () => {
    const blob = encrypt("secret", KEY);
    const forged = { ...blob, ct: Buffer.from("deadbeef", "hex").toString("base64") };
    expect(() => decrypt(forged, KEY)).toThrow();
  });

  test("a wrong key throws", () => {
    const blob = encrypt("secret", KEY);
    expect(() => decrypt(blob, randomBytes(32))).toThrow();
  });
});

describe("vault totp (RFC 6238 SHA1)", () => {
  // RFC 6238 App. B secret "12345678901234567890" is ASCII → base32-encoded here.
  const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  test("matches the official 6-digit vectors", () => {
    expect(totp(SECRET, 59_000)).toBe("287082");
    expect(totp(SECRET, 1_111_111_109_000)).toBe("081804");
    expect(totp(SECRET, 1_234_567_890_000)).toBe("005924");
  });

  test("parses an otpauth:// URI", () => {
    expect(totp(`otpauth://totp/Acme:me?secret=${SECRET}&issuer=Acme`, 59_000)).toBe("287082");
  });

  test("rejects an empty or invalid secret", () => {
    expect(() => totp("", 0)).toThrow();
    expect(() => totp("0189!", 0)).toThrow();
  });
});
