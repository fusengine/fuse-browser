/**
 * End-to-end test of the agentic targeting layer: capture an indexed snapshot
 * (each interactive element tagged with a stable ref), then act on a chosen
 * ref deterministically. Runs under Node with a real headless Chromium.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { actByRef } from "../../src/actions/act-by-ref.js";
import { captureSnapshot } from "../../src/extraction/snapshot.js";
import { createServer } from "../../src/server/server.js";
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

const COMBO =
  '<input role="combobox" placeholder="From"><ul role="listbox"></ul><div id="picked">none</div>' +
  "<script>const i=document.querySelector('input'),l=document.querySelector('ul'),p=document.getElementById('picked');" +
  "i.addEventListener('input',function(){l.innerHTML='';['Geneva (GVA)','Genoa (GOA)'].forEach(function(t){" +
  "var o=document.createElement('li');o.setAttribute('role','option');o.textContent=t;" +
  "o.addEventListener('click',function(){p.textContent=t});l.appendChild(o)})})</script>";
const COMBO_URL = `data:text/html,${encodeURIComponent(COMBO)}`;

test("pick types into a combobox and clicks the matching suggestion", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(COMBO_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const input = (await captureSnapshot(session.page)).find((e) => e.tag === "input");
    assert.ok(input, "combobox input present");
    const res = await actByRef(session.page, input.index, "pick", "Gen", "Geneva");
    assert.equal(res.ok, true, "pick should succeed");
    assert.equal(await session.page.locator("#picked").innerText(), "Geneva (GVA)");
  } finally {
    await sessions.close(session.id);
  }
});

// `prune:true` coverage (C4 rule: genuinely-hidden OR decorative-under-aria-
// hidden) moved to tests/integration/snapshot-prune.test.ts to keep this file
// under the SOLID line cap — see that file for the modal-fix regression test.

test(
  "browser_snapshot and browser_act return structuredContent honoring their declared outputSchema (no McpError)",
  { timeout: 120_000 },
  async () => {
    const { server } = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const open = await client.callTool({ name: "browser_open", arguments: { headless: true, engine: "patchright" } });
      assert.equal(open.isError, undefined, "browser_open should not error");
      const { sessionId } = open.structuredContent as { sessionId: string };

      await client.callTool({
        name: "browser_navigate",
        arguments: { sessionId, url: URL },
      });

      const snap = await client.callTool({ name: "browser_snapshot", arguments: { sessionId } });
      assert.equal(snap.isError, undefined, "browser_snapshot should not throw an outputSchema McpError");
      const { elements } = snap.structuredContent as { elements: Array<{ index: number; text: string }> };
      const button = elements.find((e) => e.text === "Go");
      assert.ok(button, "snapshot should list the Go button through the real MCP layer");

      const act = await client.callTool({
        name: "browser_act",
        arguments: { sessionId, kind: "click", ref: button.index },
      });
      assert.equal(act.isError, undefined, "browser_act should not throw an outputSchema McpError");
    } finally {
      await client.close();
    }
  },
);
