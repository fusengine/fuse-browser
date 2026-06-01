import { describe, expect, test } from "bun:test";
import { preflight } from "../../src/guardrails/preflight.js";

describe("preflight", () => {
  test("blocks sensitive action without human approval", () => {
    const result = preflight([{ type: "click", target: "Pay now" }], false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("human_approval_required");
    expect(result.blockedActions[0]).toContain("Pay now");
  });

  test("allows sensitive action with explicit human approval", () => {
    const result = preflight([{ type: "click", target: "Confirm booking" }], true);
    expect(result.allowed).toBe(true);
    expect(result.blockedActions).toEqual([]);
  });

  test("allows benign actions", () => {
    const result = preflight([{ type: "click", target: "Search hotels" }], false);
    expect(result.allowed).toBe(true);
  });
});
