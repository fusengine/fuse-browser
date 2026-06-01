import { describe, expect, test } from "bun:test";
import { isStableToken } from "../../src/extraction/selector.js";

describe("isStableToken", () => {
  test("accepts human-readable, semantic tokens", () => {
    for (const v of ["submit-button", "nav-link", "btn", "checkout_form"]) {
      expect(isStableToken(v)).toBe(true);
    }
  });

  test("rejects generated/hashed tokens", () => {
    for (const v of ["css-1a2b3c", "sc-bdVaJa", "ember123", "x", "", "a8f3e9d"]) {
      expect(isStableToken(v)).toBe(false);
    }
  });
});
