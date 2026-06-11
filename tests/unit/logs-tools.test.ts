import { describe, expect, test } from "bun:test";
import {
  filterConsole,
  filterNetwork,
  mergeNetwork,
  type NetworkEntry,
} from "../../src/server/tools/logs-filter.js";

const consoleBuf = [
  { type: "log", text: "boot" },
  { type: "error", text: "TypeError: x is undefined" },
  { type: "warning", text: "deprecated API" },
  { type: "error", text: "Failed to fetch" },
  { type: "info", text: "ready" },
];

describe("filterConsole", () => {
  test("returns everything (last 50 by default) without a level", () => {
    expect(filterConsole(consoleBuf)).toEqual(consoleBuf);
  });

  test("filters by exact level", () => {
    const errors = filterConsole(consoleBuf, "error");
    expect(errors).toEqual([
      { type: "error", text: "TypeError: x is undefined" },
      { type: "error", text: "Failed to fetch" },
    ]);
  });

  test("keeps only the last `limit` entries", () => {
    const out = filterConsole(consoleBuf, undefined, 2);
    expect(out).toEqual([
      { type: "error", text: "Failed to fetch" },
      { type: "info", text: "ready" },
    ]);
  });

  test("defaults to the last 50 on a large buffer", () => {
    const big = Array.from({ length: 60 }, (_, i) => ({ type: "log", text: `m${i}` }));
    const out = filterConsole(big);
    expect(out).toHaveLength(50);
    expect(out[0]?.text).toBe("m10");
    expect(out[49]?.text).toBe("m59");
  });
});

const events: Array<Record<string, unknown>> = [
  { type: "request", method: "GET", url: "https://a.com/", resourceType: "document" },
  { type: "request", method: "POST", url: "https://a.com/api", resourceType: "xhr" },
  { type: "response", status: 200, url: "https://a.com/" },
  { type: "response", status: 500, url: "https://a.com/api" },
  { type: "request", method: "GET", url: "https://cdn.b.com/app.js", resourceType: "script" },
];

describe("mergeNetwork", () => {
  test("joins request and response by url, keeping method/status/resourceType", () => {
    const rows = mergeNetwork(events);
    expect(rows).toEqual([
      { url: "https://a.com/", method: "GET", resourceType: "document", status: 200 },
      { url: "https://a.com/api", method: "POST", resourceType: "xhr", status: 500 },
      { url: "https://cdn.b.com/app.js", method: "GET", resourceType: "script" },
    ]);
  });

  test("handles legacy events without resourceType", () => {
    const rows = mergeNetwork([{ type: "request", method: "GET", url: "https://x.com/" }]);
    expect(rows).toEqual([{ url: "https://x.com/", method: "GET" }]);
  });
});

describe("filterNetwork", () => {
  const rows: NetworkEntry[] = mergeNetwork(events);

  test("filters by exact status", () => {
    const out = filterNetwork(rows, { status: 500 });
    expect(out).toHaveLength(1);
    expect(out[0]?.url).toBe("https://a.com/api");
  });

  test("filters by url substring", () => {
    const out = filterNetwork(rows, { urlContains: "cdn.b.com" });
    expect(out).toEqual([{ url: "https://cdn.b.com/app.js", method: "GET", resourceType: "script" }]);
  });

  test("combines filters and keeps the last `limit`", () => {
    expect(filterNetwork(rows, { urlContains: "a.com", limit: 1 })).toEqual([
      { url: "https://a.com/api", method: "POST", resourceType: "xhr", status: 500 },
    ]);
    expect(filterNetwork(rows, { status: 404 })).toEqual([]);
  });
});
