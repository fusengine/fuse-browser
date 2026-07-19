import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { resolveClickTarget } from "../../src/actions/resolve-click-target.js";

/** A locator stub with a fixed match count. */
function makeLocator(count: number): Locator {
  const self = { first: () => self, count: async () => count };
  return self as unknown as Locator;
}

const MISS = makeLocator(0);
const HIT = makeLocator(1);

describe("resolveClickTarget", () => {
  test("uses the selector strategy when it matches (regression guardrail: normal CSS unaffected)", async () => {
    const page = { locator: () => HIT } as unknown as Page;
    const resolved = await resolveClickTarget(page, "#submit");
    expect(resolved?.strategy).toBe("selector");
  });

  test("falls through to text/label when the selector strategy throws (malformed CSS, e.g. a bare '?')", async () => {
    const page = {
      locator: () => ({
        first: () => {
          throw new Error('Unexpected token "?" while parsing selector "Où allez-vous ?"');
        },
      }),
      getByRole: () => MISS,
      getByText: () => HIT,
      getByLabel: () => MISS,
    } as unknown as Page;
    const resolved = await resolveClickTarget(page, "Où allez-vous ?");
    expect(resolved?.strategy).toBe("text");
  });

  test("returns null when nothing matches", async () => {
    const page = {
      locator: () => MISS,
      getByRole: () => MISS,
      getByText: () => MISS,
      getByLabel: () => MISS,
    } as unknown as Page;
    expect(await resolveClickTarget(page, "Nope")).toBeNull();
  });

  test("an earlier-matching strategy (label) still wins over placeholder, unaffected by its addition", async () => {
    const page = {
      locator: () => MISS,
      getByRole: () => MISS,
      getByText: () => MISS,
      getByLabel: () => HIT,
      getByPlaceholder: () => HIT,
    } as unknown as Page;
    const resolved = await resolveClickTarget(page, "Email");
    expect(resolved?.strategy).toBe("label");
  });

  test("resolves via the placeholder strategy when only the placeholder attribute matches (booking.com destination field: no visible text, no <label>)", async () => {
    const page = {
      locator: () => ({
        first: () => {
          throw new Error('Unexpected token "?" while parsing selector "Où allez-vous ?"');
        },
      }),
      getByRole: () => MISS,
      getByText: () => MISS,
      getByLabel: () => MISS,
      getByPlaceholder: () => HIT,
    } as unknown as Page;
    const resolved = await resolveClickTarget(page, "Où allez-vous ?");
    expect(resolved?.strategy).toBe("placeholder");
  });
});
