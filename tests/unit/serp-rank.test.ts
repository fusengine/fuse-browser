import { describe, expect, test } from "bun:test";
import { findDomainRanks } from "../../src/extraction/serp-rank.js";
import type { Serp } from "../../src/interfaces/extraction.js";

const serp: Serp = {
  organic: [
    { position: 1, title: "Wix", url: "https://fr.wix.com/" },
    { position: 2, title: "Infomaniak", url: "https://www.infomaniak.com/fr/x" },
    { position: 3, title: "Fuse", url: "https://fusengine.ch/" },
  ],
  ads: [{ position: 1, title: "Ad", url: "https://www.infomaniak.com/ad" }],
  related: [],
};

describe("findDomainRanks", () => {
  test("matches a domain including subdomains, ignores lookalikes", () => {
    const r = findDomainRanks(serp, "wix.com");
    expect(r.organic).toEqual([1]);
    expect(r.best).toBe(1);
    expect(r.found).toBe(true);
  });

  test("accepts a full URL target and finds organic + ads", () => {
    const r = findDomainRanks(serp, "https://www.infomaniak.com/anything");
    expect(r.organic).toEqual([2]);
    expect(r.ads).toEqual([1]);
    expect(r.best).toBe(2);
  });

  test("not found -> empty positions and null best", () => {
    const r = findDomainRanks(serp, "example.org");
    expect(r.found).toBe(false);
    expect(r.best).toBeNull();
    expect(r.organic).toEqual([]);
  });
});
