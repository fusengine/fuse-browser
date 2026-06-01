/**
 * End-to-end test of robust selector generation: snapshot with `selectors:true`
 * yields a durable CSS selector per element, preferring stable hooks and
 * rejecting generated ids, and the selector resolves to exactly one element.
 * Runs under Node with a real headless Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { captureSnapshot } from "../../src/extraction/snapshot.js";
import { SessionManager } from "../../src/session/manager.js";

const PAGE =
  "<button id='submit-button' data-testid='go'>Go</button>" +
  "<div><button id='css-1a2b3c'>Hashed</button></div>";
const URL = `data:text/html,${encodeURIComponent(PAGE)}`;

test("snapshot selectors yields stable, unique CSS selectors", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const els = await captureSnapshot(session.page, true);

    const go = els.find((e) => e.text === "Go");
    assert.ok(go?.selector, "stable button should get a selector");
    assert.ok(go.selector?.includes("data-testid") || go.selector === "#submit-button", `prefers a stable hook, got ${go.selector}`);
    assert.equal(await session.page.locator(go.selector ?? "").count(), 1, "selector resolves to exactly one element");

    const hashed = els.find((e) => e.text === "Hashed");
    assert.ok(hashed?.selector && !hashed.selector.includes("#css-1a2b3c"), "must NOT use the generated id");
  } finally {
    await sessions.close(session.id);
  }
});
