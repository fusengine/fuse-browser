import { describe, expect, test } from "bun:test";
import { cleanRows, normalizeString, parseNumber } from "../../src/extraction/pipeline/clean.js";
import { dedupeRows } from "../../src/extraction/pipeline/dedupe.js";
import { runPipeline } from "../../src/extraction/pipeline/run.js";
import { validateRows } from "../../src/extraction/pipeline/validate.js";

describe("clean", () => {
  test("normalizeString decodes entities and collapses whitespace", () => {
    expect(normalizeString("a&amp;b&nbsp;  c\n d")).toBe("a&b c d");
  });
  test("parseNumber handles thousands/decimal variants", () => {
    expect(parseNumber("€1,234.56")).toBe(1234.56);
    expect(parseNumber("1 234,56")).toBe(1234.56);
    expect(parseNumber("CHF 1'234.50")).toBe(1234.5);
    expect(parseNumber("free")).toBe(null);
  });
  test("cleanRows coerces numeric fields", () => {
    expect(cleanRows([{ price: "€ 89,90" }], ["price"])[0]?.price).toBe(89.9);
  });
});

describe("validateRows", () => {
  test("splits valid/invalid by rules", () => {
    const r = validateRows(
      [{ p: 50 }, { p: 5 }, {}],
      { p: { required: true, type: "number", min: 10 } },
    );
    expect(r.valid.length).toBe(1);
    expect(r.invalid.length).toBe(2);
    expect(r.invalid[0]?.errors[0]).toContain("min");
  });
});

describe("dedupeRows", () => {
  test("dedupes by composite key, case-insensitive, keep last", () => {
    const rows = [{ a: "X", n: 1 }, { a: "x", n: 2 }, { a: "y", n: 3 }];
    const out = dedupeRows(rows, ["a"], "last");
    expect(out.length).toBe(2);
    expect(out.find((r) => String(r.a).toLowerCase() === "x")?.n).toBe(2);
  });
});

describe("runPipeline", () => {
  test("clean → validate → dedupe → pick → csv", () => {
    const rows = [
      { name: "A&amp;B", price: "CHF 1'200.00" },
      { name: "A&amp;B", price: "CHF 1'200.00" },
      { name: "C", price: "free" },
    ];
    const out = runPipeline(rows, {
      clean: { numericFields: ["price"] },
      validate: { price: { required: true, type: "number" } },
      dedupeBy: ["name"],
      columns: ["name", "price"],
      emit: "csv",
    });
    expect(out.rows.length).toBe(1); // A&B deduped, C rejected (price not a number)
    expect(out.invalid.length).toBe(1);
    expect(out.rows[0]).toEqual({ name: "A&B", price: 1200 });
    expect(out.csv).toContain("name,price");
  });
});
