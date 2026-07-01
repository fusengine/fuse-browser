/**
 * End-to-end: the vault's Tier-1 redaction nulls password-input values in the
 * snapshot, browser-side, so a filled password never reaches the LLM — while
 * non-password fields keep their value. Runs under Node with real Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { captureSnapshot } from "../../src/extraction/snapshot.js";
import { SessionManager } from "../../src/session/manager.js";

const PAGE = "<input type=password id=pw value='hunter2'><input type=text id=u value='alice'>";
const URL = `data:text/html,${encodeURIComponent(PAGE)}`;

test("Tier 1: password value is nulled in the snapshot", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const els = await captureSnapshot(session.page);
    const pw = els.find((e) => e.type === "password");
    assert.ok(pw, "password input present");
    assert.equal(pw.value, null, "password value must be nulled");
    assert.equal(pw.hasValue, true, "hasValue flags a filled field");
    const user = els.find((e) => e.id === "u");
    assert.equal(user?.value, "alice", "non-password value is preserved");
  } finally {
    await sessions.close(session.id);
  }
});
