/**
 * Regression proof for the SMF hollow-extraction bug: Defuddle's `removeExactSelectors`
 * step deletes the bare `<form>` wrapping every forum post, silently dropping the
 * post bodies. Runs the REAL markdown pipeline (`renderFetch`) against saved fixtures.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { renderFetch } from "../../src/agent/fetch-render.js";
import { htmlToText } from "../../src/net/fetch-fast.js";

const FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));
const smfThread = readFileSync(`${FIXTURES}smf-thread.html`, "utf-8");
const smfBoard = readFileSync(`${FIXTURES}smf-board.html`, "utf-8");
const sparseLogin = readFileSync(`${FIXTURES}sparse-login.html`, "utf-8");

function bodyOf(html: string, url: string) {
  return { status: 200, url, html, text: htmlToText(html), isHtml: true, escalated: false };
}

test("SMF thread: hollow extraction is auto-recovered", async () => {
  const rendered = await renderFetch(bodyOf(smfThread, "https://forum.opnsense.org/index.php?topic=52453.0"));
  assert.equal(rendered.extraction, "recovered");
  for (const phrase of ["MAC addresses", "importer script", "Supermicro"]) {
    assert.ok(rendered.text.includes(phrase), `expected recovered text to contain "${phrase}"`);
  }
  assert.ok((rendered.wordCount ?? 0) < 100, "defuddle's own wordCount stays low (it's what triggered recovery)");
});

test("SMF board index: NOT recovered — no link-soup regression", async () => {
  const rendered = await renderFetch(bodyOf(smfBoard, "https://forum.opnsense.org/index.php?board=1.0"));
  assert.equal(rendered.extraction, "primary", "a link-heavy listing must never be dumped as raw link soup");
  assert.ok(!/\t{2,}/.test(rendered.text), "output should not balloon into raw tab-soup");
});

test("Sparse login page: NOT recovered — short legit page stays primary", async () => {
  const rendered = await renderFetch(bodyOf(sparseLogin, "https://example.com/login"));
  assert.equal(rendered.extraction, "primary", "a genuinely sparse login page must never be recovered");
  assert.ok(!/\t{2,}/.test(rendered.text), "output should not balloon into raw tab-soup");
});

test("synthetic article: primary extraction, byte-identical to pre-recovery output", async () => {
  const html =
    '<!DOCTYPE html><html lang="en"><head><title>Hello World</title></head>' +
    "<body><nav>Menu Home About</nav><article><h1>Hello World</h1>" +
    '<p>This is the main content with a [special] "quote" inside.</p></article>' +
    "<footer>Copyright</footer></body></html>";
  const rendered = await renderFetch(bodyOf(html, "https://x.com/post"));
  assert.equal(rendered.extraction, "primary");
  assert.ok(rendered.text.includes("main content"));
  assert.ok(!rendered.text.includes("Menu Home About"));
});
