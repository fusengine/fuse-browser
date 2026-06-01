/**
 * End-to-end test of pixel visual diff on real Chromium screenshots: two pages
 * of identical size where one adds a black box must yield a non-zero diff with
 * at least one changed region; identical captures must yield zero.
 * Runs under Node with a real headless Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { diffPng } from "../../src/lib/pixel-diff.js";
import { SessionManager } from "../../src/session/manager.js";

const BLANK = `data:text/html,${encodeURIComponent("<body style='margin:0;background:#fff;height:600px'></body>")}`;
const BOXED = `data:text/html,${encodeURIComponent("<body style='margin:0;background:#fff;height:600px'><div style='position:absolute;left:40px;top:40px;width:120px;height:80px;background:#000'></div></body>")}`;

test("visual diff flags a changed region between two real screenshots", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.setViewportSize({ width: 400, height: 300 });
    await session.page.goto(BLANK, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const a = await session.page.screenshot();

    assert.equal(diffPng(a, a).diffPixels, 0, "identical screenshots → zero diff");

    await session.page.goto(BOXED, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const b = await session.page.screenshot();
    const d = diffPng(a, b);
    assert.ok(d.diffPixels > 0, "adding a box must change pixels");
    assert.ok(d.regions.length >= 1, "the box must surface as a changed region");
  } finally {
    await sessions.close(session.id);
  }
});
