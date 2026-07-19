/**
 * Real-browser proof that `OVERLAY_DISMISS_SELECTORS` (FIX 2) matches only a
 * genuine exact-text consent control, never a same-substring decoy button
 * ("Book"/"Cookie"/"Token"/an aria-label containing "close") that a prior
 * `:has-text()`/`[attr*= i]` substring match would have hit. Runs under Node
 * with a real headless Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { OVERLAY_DISMISS_SELECTORS } from "../../src/actions/robust-click.js";
import { SessionManager } from "../../src/session/manager.js";

const PAGE =
  "<button>Book</button>" +
  "<button>Cookie</button>" +
  "<button>Token</button>" +
  "<button aria-label='disclose panel'>i</button>" +
  "<button id='accept-all'>Accept all</button>";
const URL = `data:text/html,${encodeURIComponent(PAGE)}`;

test("overlay-dismiss selectors match only the real consent button, never a substring decoy", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await session.page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // `:text-is()` is a Playwright-only pseudo-class (not real CSS), so this
    // must be resolved through Playwright's own selector engine
    // (`page.locator`), never the native `Element.matches()` — that throws
    // "not a valid selector" on a real DOM node.
    const matches = await session.page.locator(OVERLAY_DISMISS_SELECTORS).all();
    const texts = await Promise.all(matches.map((m) => m.textContent()));
    assert.deepEqual(
      texts.map((t) => t?.trim()),
      ["Accept all"],
      "must match exactly the real consent button — none of the Book/Cookie/Token/disclose decoys",
    );
  } finally {
    await sessions.close(session.id);
  }
});
