import { describe, expect, test } from "bun:test";
import { serpBatchToCsv, toCsv } from "../../src/lib/serp-csv.js";
import type { SerpBatchRow } from "../../src/interfaces/serp.js";

describe("toCsv", () => {
  test("quotes fields with comma/quote/newline and doubles quotes", () => {
    const csv = toCsv([{ a: 'say "hi"', b: "x,y", c: "plain" }], ["a", "b", "c"]);
    expect(csv).toBe('a,b,c\r\n"say ""hi""","x,y",plain\r\n');
  });

  test("joins array cells with ';'", () => {
    expect(toCsv([{ p: [1, 3, 7] }], ["p"])).toBe('p\r\n1;3;7\r\n');
  });
});

describe("serpBatchToCsv", () => {
  test("one row per query with rank columns", () => {
    const rows: SerpBatchRow[] = [
      { query: "agence web", rank: { domain: "x.ch", organic: [2, 5], ads: [], best: 2, found: true }, results: [{ position: 1, title: "t", url: "u" }] },
      { query: "no rank", results: [], error: "blocked" },
    ];
    const csv = serpBatchToCsv(rows);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe("query,domain,found,best,organic,ads,results,error");
    expect(lines[1]).toBe("agence web,x.ch,true,2,2;5,,1,");
    expect(lines[2]).toBe("no rank,,,,,,0,blocked");
  });
});
