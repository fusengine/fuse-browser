/**
 * End-to-end test that the extraction pipeline runs over real collected rows
 * (CollectedItem[] from scrollCollect), as browser_collect wires it: clean →
 * dedupe → pick columns → emit CSV. Real headless Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { runPipeline } from "../../src/extraction/pipeline/run.js";
import { scrollCollect } from "../../src/state/scroll-collect.js";
import { SessionManager } from "../../src/session/manager.js";

const PAGE =
  "<div id='c' style='height:200px;overflow:auto'><div id='sp' style='height:3000px;position:relative'></div></div>" +
  "<script>var c=document.getElementById('c'),sp=document.getElementById('sp'),T=40,RH=50;" +
  "function render(){var s=Math.floor(c.scrollTop/RH),e=Math.min(T,s+5);" +
  "[].slice.call(sp.querySelectorAll('.row')).forEach(function(n){n.remove()});" +
  "for(var i=s;i<e;i++){var d=document.createElement('div');d.className='row';d.setAttribute('data-id','i'+i);" +
  "d.style.cssText='position:absolute;top:'+(i*RH)+'px;height:'+RH+'px';d.textContent='Row '+i;sp.appendChild(d)}}" +
  "c.addEventListener('scroll',render);render();</script>";
const URL = `data:text/html,${encodeURIComponent(PAGE)}`;

test("pipeline cleans, dedupes and emits CSV from collected rows", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const collected = await scrollCollect(session.page, { item: ".row", container: "#c" });
    const rows = collected.items as unknown as Record<string, unknown>[];

    const out = runPipeline(rows, { dedupeBy: ["key"], columns: ["key", "text"], emit: "csv" });
    assert.ok(out.rows.length >= 35, `should keep the collected rows, got ${out.rows.length}`);
    assert.equal(new Set(out.rows.map((r) => r.key)).size, out.rows.length, "rows must be unique by key");
    assert.deepEqual(Object.keys(out.rows[0] ?? {}), ["key", "text"], "columns restricted to key,text");
    assert.ok(out.csv?.startsWith("key,text"), "CSV header present");
  } finally {
    await sessions.close(session.id);
  }
});
