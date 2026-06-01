/**
 * End-to-end test of the agentic targeting layer: capture an indexed snapshot
 * (each interactive element tagged with a stable ref), then act on a chosen
 * ref deterministically. Runs under Node with a real headless Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { actByRef } from "../../src/actions/act-by-ref.js";
import { captureSnapshot } from "../../src/extraction/snapshot.js";
import { SessionManager } from "../../src/session/manager.js";

// Encoded data URL: an unencoded data: URL truncates at the first space, which
// would drop the inline <script> and break the click handler.
const PAGE =
  "<button onclick=\"document.getElementById('out').textContent='clicked'\">Go</button>" +
  "<input placeholder='Where' value='Geneva' />" +
  "<select><option>Eco</option><option>Business</option></select>" +
  "<button disabled>Search</button><div id='out'>idle</div>";
const URL = `data:text/html,${encodeURIComponent(PAGE)}`;

test("snapshot tags refs and act-by-ref clicks the right element", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const elements = await captureSnapshot(session.page);
    assert.ok(elements.length >= 2, "snapshot should list button + input");
    const button = elements.find((e) => e.text === "Go");
    assert.ok(button, "button should be in the snapshot");

    // Agentic enrichment: value/placeholder/options/disabled exposed to the LLM.
    const input = elements.find((e) => e.tag === "input");
    assert.equal(input?.value, "Geneva", "input current value");
    assert.equal(input?.placeholder, "Where", "input placeholder");
    const select = elements.find((e) => e.tag === "select");
    assert.deepEqual(select?.options, ["Eco", "Business"], "select options");
    const disabled = elements.find((e) => e.text === "Search");
    assert.equal(disabled?.disabled, true, "disabled button flagged");

    const click = await actByRef(session.page, button.index, "click");
    assert.equal(click.ok, true);
    assert.equal(click.strategy, "ref");
    assert.equal(await session.page.locator("#out").innerText(), "clicked");

    const missing = await actByRef(session.page, 9999, "click");
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "ref_not_found");
  } finally {
    await sessions.close(session.id);
  }
});
