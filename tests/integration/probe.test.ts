/**
 * End-to-end test: a real headless Chromium probe through BrowserAgent.
 * Guards the `lib/evaluate` IIFE fix (DOM signature, prices, visual) and the
 * payment guardrail. Runs under Node with a real browser (slow → long timeout).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BrowserAgent } from "../../src/agent/browser-agent.js";
import { GuardrailViolation } from "../../src/lib/errors.js";

const HTML =
  "<title>Smoke</title><body><h1>Hello</h1><p>CHF 129</p><button>Go</button></body>";

test("probeHtml extracts text, prices and visual via real Chromium", { timeout: 120_000 }, async () => {
  const agent = new BrowserAgent({ countryCode: "CH", engine: "patchright" });
  const report = await agent.probeHtml(HTML, { extractPrices: true, observeVisual: true });

  assert.equal(report.title, "Smoke");
  assert.equal(typeof report.domChanged, "boolean"); // DOM signature ran (IIFE fix)
  assert.ok(report.text.includes("Hello"), "page text should be captured");
  // Assert the meaningful fields only; `lineNo` depends on Chromium innerText
  // whitespace normalization and must not make the test brittle.
  assert.equal(report.prices.length, 1, "exactly one price expected");
  const [price] = report.prices;
  assert.equal(price?.currency, "CHF");
  assert.equal(price?.amount, 129);
  assert.equal(price?.line, "CHF 129");
  assert.ok((price?.lineNo ?? -1) >= 0, "lineNo should be a valid line index");
  const els = "interactiveElements" in report.visual ? report.visual.interactiveElements : undefined;
  assert.ok((els?.length ?? 0) >= 1, "visual observation should list the button");
  assert.equal(report.identity.countryCode, "CH");
  assert.equal(report.identity.currency, "CHF");
});

test("probe blocks sensitive actions without approval", { timeout: 30_000 }, async () => {
  const agent = new BrowserAgent({ engine: "patchright" });
  await assert.rejects(
    agent.probe("data:text/html,<body>x</body>", { actions: [{ type: "click", target: "Pay now" }] }),
    (err: unknown) => err instanceof GuardrailViolation && err.reason === "human_approval_required",
  );
});
