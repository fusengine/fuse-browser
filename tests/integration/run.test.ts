/**
 * End-to-end test of browser_run: a multi-step plan in one call against a real
 * headless Chromium (navigate → wait_for → click → extract).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { runSteps } from "../../src/agent/run-steps.js";
import { SessionManager } from "../../src/session/manager.js";

const PAGE =
  "<button onclick=\"document.getElementById('o').textContent='done'\">go</button>" +
  "<div id='o'>idle</div><p>CHF 99</p>";
const URL = `data:text/html,${encodeURIComponent(PAGE)}`;

test("runSteps executes a plan and stops on success", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    const results = await runSteps(session.page, [
      { type: "navigate", url: URL },
      { type: "wait_for", selector: "button" },
      { type: "click", target: "go" },
      { type: "extract", kind: "prices" },
    ]);
    assert.equal(results.length, 4, "all 4 steps run");
    assert.ok(results.every((r) => r.ok), `every step ok: ${JSON.stringify(results)}`);
    const extract = results[3]?.data as { prices?: Array<{ amount: number }> };
    assert.equal(extract.prices?.[0]?.amount, 99);
  } finally {
    await sessions.close(session.id);
  }
});

test("runSteps stops at the first failing step", { timeout: 60_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    const results = await runSteps(session.page, [
      { type: "navigate", url: URL },
      { type: "wait_for", selector: "#nope", timeoutMs: 1_500 },
      { type: "click", target: "go" },
    ]);
    assert.equal(results.length, 2, "stops after the failed wait_for");
    assert.equal(results[1]?.ok, false);
  } finally {
    await sessions.close(session.id);
  }
});
