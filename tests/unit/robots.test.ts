import { describe, expect, test } from "bun:test";
import { parseRobots } from "../../src/net/robots.js";

const ROBOTS = `
# sample
User-agent: *
Disallow: /private
Allow: /private/public
Disallow: /*.pdf$

User-agent: fuse-browser
Disallow: /
`;

describe("parseRobots", () => {
  test("disallows by prefix, allows elsewhere", () => {
    const m = parseRobots(ROBOTS);
    expect(m.isAllowed("https://x.com/private/page", "Googlebot")).toBe(false);
    expect(m.isAllowed("https://x.com/public/page", "Googlebot")).toBe(true);
  });
  test("longest-match: a more specific Allow overrides a shorter Disallow", () => {
    expect(parseRobots(ROBOTS).isAllowed("https://x.com/private/public/x", "Googlebot")).toBe(true);
  });
  test("$ end-anchor matches path+query, not just pathname", () => {
    const m = parseRobots(ROBOTS);
    expect(m.isAllowed("https://x.com/file.pdf", "Googlebot")).toBe(false);
    expect(m.isAllowed("https://x.com/file.pdf?x=1", "Googlebot")).toBe(true);
  });
  test("exact user-agent group beats the * group", () => {
    expect(parseRobots(ROBOTS).isAllowed("https://x.com/anything", "fuse-browser")).toBe(false);
  });
  test("no matching rule → allowed", () => {
    expect(parseRobots("User-agent: *\nDisallow: /admin").isAllowed("https://x.com/", "*")).toBe(true);
  });
  test("empty robots → allow all", () => {
    expect(parseRobots("").isAllowed("https://x.com/whatever")).toBe(true);
  });
});
