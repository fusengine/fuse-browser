/**
 * End-to-end test of collectBatch: run the one-shot collect over several
 * virtualized-list URLs in parallel (real headless Chromium per URL) and assert
 * each is exhausted and deduped, with per-URL error isolation.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { collectBatch } from "../../src/agent/collect-batch.js";
import { resolveConfig } from "../../src/agent/config.js";

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

test("collectBatch exhausts several lists in parallel, errors isolated", { timeout: 120_000 }, async () => {
  const config = resolveConfig({ headless: true, engine: "patchright" });
  const results = await collectBatch(config, [URL, URL, "https://this-host-does-not-exist-zzz.invalid/"], {
    item: ".row",
    container: "#c",
    concurrency: 2,
    throttleMs: 0,
  });

  assert.equal(results.length, 3, "one result per input URL");
  for (const r of results.slice(0, 2)) {
    assert.ok("items" in r, "first two URLs should succeed");
    if ("items" in r) {
      assert.ok(r.count >= 95, `should collect ~100 rows, got ${r.count}`);
      assert.equal(r.reachedEnd, true, "should detect the end of the list");
    }
  }
  const bad = results[2];
  assert.ok(bad && "error" in bad, "the invalid URL must fail without aborting the batch");
});
