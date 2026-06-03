import { describe, expect, test } from "bun:test";
import { toAgentOptions, toProbeOptions } from "../../src/server/map-options.js";

describe("toProbeOptions — contacts", () => {
  test("maps extractContacts and contactCrawl", () => {
    const p = toProbeOptions({ extractContacts: true, contactCrawl: { enabled: true, maxPages: 2 } });
    expect(p.extractContacts).toBe(true);
    expect(p.contactCrawl).toEqual({ enabled: true, maxPages: 2 });
  });
  test("absent contact flags stay undefined", () => {
    const p = toProbeOptions({});
    expect(p.extractContacts).toBeUndefined();
    expect(p.contactCrawl).toBeUndefined();
  });
});

describe("toAgentOptions — CDP remote", () => {
  test("maps cdpHeaders / cdpCloseOnDone / cdpTimeoutMs", () => {
    const a = toAgentOptions({
      cdpHeaders: { Authorization: "Bearer x" },
      cdpCloseOnDone: false,
      cdpTimeoutMs: 5000,
    });
    expect(a.cdpHeaders).toEqual({ Authorization: "Bearer x" });
    expect(a.cdpCloseOnDone).toBe(false);
    expect(a.cdpTimeoutMs).toBe(5000);
  });
  test("absent CDP options stay undefined", () => {
    const a = toAgentOptions({});
    expect(a.cdpHeaders).toBeUndefined();
    expect(a.cdpCloseOnDone).toBeUndefined();
    expect(a.cdpTimeoutMs).toBeUndefined();
  });
  test("maps respectRobots (default undefined)", () => {
    expect(toAgentOptions({ respectRobots: true }).respectRobots).toBe(true);
    expect(toAgentOptions({}).respectRobots).toBeUndefined();
  });
});
