import { describe, expect, test } from "bun:test";
import { isThinShell } from "../../src/net/thin-shell.js";

const LONG = "Lorem ipsum dolor sit amet ".repeat(40); // > 600 chars of real content

describe("isThinShell", () => {
  test("page with substantial visible text is NOT a shell", () => {
    expect(isThinShell(`<html><body><p>${LONG}</p></body></html>`)).toBe(false);
  });

  test("SPA root + thin text IS a shell", () => {
    expect(isThinShell(`<html><body><div id="__next"></div><script src="/a.js"></script></body></html>`)).toBe(true);
  });

  test("script-heavy + thin text IS a shell", () => {
    expect(isThinShell(`<html><body>loading…<script></script><script></script><script></script></body></html>`)).toBe(true);
  });

  test("inline-script source does NOT count as visible content (the real CSR-shell bug)", () => {
    // textContent would include this JS; visibleTextLength must strip it → still thin.
    const fat = `<script>${LONG}${LONG}</script>`;
    expect(isThinShell(`<html><body><div id="root"></div>${fat}<script></script><script></script></body></html>`)).toBe(true);
  });

  test("short page, no SPA markers, few scripts is NOT a shell (no false escalate)", () => {
    expect(isThinShell(`<html><body><h1>404</h1><p>Not found</p><script></script></body></html>`)).toBe(false);
  });

  test("SPA root but already-rendered (long text) is NOT a shell", () => {
    expect(isThinShell(`<html><body><div id="root"><p>${LONG}</p></div></body></html>`)).toBe(false);
  });
});
