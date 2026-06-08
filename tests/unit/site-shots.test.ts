import { describe, expect, test } from "bun:test";
import { mergePagesWithShots } from "../../src/agent/site-shots.js";

const shot = { viewport: "mobile", width: 390, height: 844, path: "/tmp/a.png" };

describe("mergePagesWithShots", () => {
  test("attaches each URL's shots to its page, in page order", () => {
    const pages = [
      { url: "https://x/", depth: 0, text: "home" },
      { url: "https://x/a", depth: 1, text: "page a" },
    ];
    const merged = mergePagesWithShots(pages, [
      { url: "https://x/a", shots: [shot] },
      { url: "https://x/", shots: [shot, shot] },
    ]);
    expect(merged[0]).toEqual({ url: "https://x/", depth: 0, text: "home", shots: [shot, shot] });
    expect(merged[1]?.shots.length).toBe(1);
  });

  test("surfaces a per-URL shot error and leaves shots empty", () => {
    const merged = mergePagesWithShots([{ url: "https://x/", depth: 0, text: "t" }], [
      { url: "https://x/", error: "boom" },
    ]);
    expect(merged[0]?.shots).toEqual([]);
    expect(merged[0]?.shotsError).toBe("boom");
  });

  test("a page with no matching shot entry gets empty shots, no error", () => {
    const merged = mergePagesWithShots([{ url: "https://x/", depth: 0, text: "t" }], []);
    expect(merged[0]?.shots).toEqual([]);
    expect(merged[0]?.shotsError).toBeUndefined();
  });
});
