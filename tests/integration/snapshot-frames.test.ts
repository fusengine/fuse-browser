/**
 * End-to-end test of cross-boundary snapshot coverage: open Shadow DOM (pierced
 * in-page) and iframes (walked per-frame, ref scoped as "<frame>:<local>").
 * Runs under Node with a real headless Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { actByRef } from "../../src/actions/act-by-ref.js";
import { resolveConfig } from "../../src/agent/config.js";
import { captureSnapshot } from "../../src/extraction/snapshot.js";
import { SessionManager } from "../../src/session/manager.js";

const NESTED =
  "<div id='host'></div><iframe id='fr'></iframe>" +
  "<script>" +
  "document.getElementById('host').attachShadow({mode:'open'}).innerHTML='<button>ShadowGo</button>';" +
  "document.getElementById('fr').srcdoc='<button onclick=\"document.title=String(1)\">Frame</button>';" +
  "</script>";
const NESTED_URL = `data:text/html,${encodeURIComponent(NESTED)}`;

test("snapshot pierces shadow DOM and iframes, act targets a frame ref", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(NESTED_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await session.page.frameLocator("#fr").locator("button").waitFor({ state: "attached", timeout: 30_000 });

    const elements = await captureSnapshot(session.page);
    const shadowBtn = elements.find((e) => e.text === "ShadowGo");
    assert.ok(shadowBtn, "open shadow DOM button should be in the snapshot");

    const frameBtn = elements.find((e) => e.text === "Frame");
    assert.ok(frameBtn, "iframe button should be in the snapshot");
    assert.ok(frameBtn.ref?.includes(":"), 'iframe ref should be frame-scoped ("<frame>:<local>")');
    assert.ok((frameBtn.frame ?? 0) > 0, "iframe element should carry a frame ordinal");

    const click = await actByRef(session.page, frameBtn.ref ?? "", "click");
    assert.equal(click.ok, true, "clicking a ref inside an iframe should succeed");
  } finally {
    await sessions.close(session.id);
  }
});
