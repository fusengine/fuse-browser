/**
 * End-to-end test of scroll-collect against a VIRTUALIZED list: a scroll
 * container that mounts only ~5 rows around scrollTop and recycles nodes as you
 * scroll (data-id changes). A single snapshot would see ~5 rows; collect must
 * accumulate the full set by scrolling and deduping by key.
 * Runs under Node with a real headless Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { scrollCollect } from "../../src/state/scroll-collect.js";
import { SessionManager } from "../../src/session/manager.js";

const PAGE =
  "<div id='c' style='height:200px;overflow:auto'>" +
  "<div id='sp' style='height:5000px;position:relative'></div></div>" +
  "<script>var c=document.getElementById('c'),sp=document.getElementById('sp'),T=100,RH=50;" +
  "function render(){var s=Math.floor(c.scrollTop/RH),e=Math.min(T,s+5);" +
  "[].slice.call(sp.querySelectorAll('.row')).forEach(function(n){n.remove()});" +
  "for(var i=s;i<e;i++){var d=document.createElement('div');d.className='row';" +
  "d.setAttribute('data-id','item-'+i);d.style.cssText='position:absolute;top:'+(i*RH)+'px;height:'+RH+'px';" +
  "d.textContent='Row '+i+' CHF '+(i+10);sp.appendChild(d)}}" +
  "c.addEventListener('scroll',render);render();</script>";
const URL = `data:text/html,${encodeURIComponent(PAGE)}`;

test("scroll-collect exhausts a virtualized list and dedups by key", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const res = await scrollCollect(session.page, { item: ".row", container: "#c", extractPrices: true });

    assert.ok(res.items.length >= 95, `should collect ~100 rows, got ${res.items.length}`);
    assert.equal(new Set(res.items.map((i) => i.key)).size, res.items.length, "keys must be unique");
    assert.ok(res.items.some((i) => i.key === "item-99"), "should reach the last virtualized row");
    assert.equal(res.reachedEnd, true, "should detect the end of the list");
    const priced = res.items.find((i) => i.key === "item-0");
    assert.ok(priced?.prices?.some((p) => p.currency === "CHF" && p.amount === 10), "rows should carry extracted prices");
  } finally {
    await sessions.close(session.id);
  }
});
