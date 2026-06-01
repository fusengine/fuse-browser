/**
 * End-to-end test of schema-based structured extraction against a real
 * headless Chromium: text, attribute, absolute URL (IDL read), list, missing.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { extractStructured } from "../../src/extraction/structured.js";
import { SessionManager } from "../../src/session/manager.js";

// `abs` is tested with an already-absolute href: on a data: URL a relative href
// has no base to resolve against, so an absolute one keeps el.href deterministic.
const PAGE =
  "<h1 class='t'>Title</h1><span data-price='42'>x</span>" +
  "<a id='lnk' href='https://example.com/path'>go</a><ul><li class='i'>a</li><li class='i'>b</li></ul>";
const URL = `data:text/html,${encodeURIComponent(PAGE)}`;

test("extractStructured reads text, attr, abs url, list and null", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const data = await extractStructured(session.page, {
      title: { selector: "h1.t" },
      price: { selector: "[data-price]", attr: "data-price" },
      link: { selector: "#lnk", attr: "href", abs: true },
      items: { selector: "li.i", all: true },
      missing: { selector: ".nope" },
    });
    assert.equal(data.title, "Title");
    assert.equal(data.price, "42");
    assert.equal(data.link, "https://example.com/path"); // IDL read returns absolute URL
    assert.deepEqual(data.items, ["a", "b"]);
    assert.equal(data.missing, null);
  } finally {
    await sessions.close(session.id);
  }
});

test("extractStructured tolerates an invalid selector (null, no throw)", { timeout: 60_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const data = await extractStructured(session.page, { bad: { selector: "div[foo" } });
    assert.equal(data.bad, null);
  } finally {
    await sessions.close(session.id);
  }
});
