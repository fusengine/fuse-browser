/**
 * End-to-end coverage of `browser_snapshot`'s `prune:true` (the "C4" rule):
 * an element is dropped only if it is genuinely hidden (`Element.
 * checkVisibility()` false — display:none / visibility:hidden|collapse) OR it
 * is decorative under an `aria-hidden` ancestor (present but NOT focusable).
 * Split out of snapshot.test.ts to stay under the SOLID line cap.
 * @module tests/integration/snapshot-prune
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { captureSnapshot } from "../../src/extraction/snapshot.js";
import { SessionManager } from "../../src/session/manager.js";

// A VISIBLE + FOCUSABLE element under an `aria-hidden` ancestor —
// `HiddenAriaFocusable`, a real `<button>` — is now KEPT: this is the modal
// fix (an SPA that marks a root/sibling wrapper `aria-hidden` while a dialog
// inside it stays interactive must not have its interactive contents pruned
// away). `HiddenAriaDecorative` (`[role=option]`, no native focusability and
// no `tabindex`) proves the non-focusable-under-aria-hidden case is still
// pruned. `HiddenDisplay`/`HiddenVisibility` prove genuinely-hidden elements
// are still pruned regardless of focusability (`visibility:hidden` text is
// unrendered, so it is identified via `aria-label` instead of `innerText`).
const PRUNE_PAGE =
  "<button>Visible</button>" +
  "<div aria-hidden='true'><button>HiddenAriaFocusable</button></div>" +
  "<div aria-hidden='true'><span role='option'>HiddenAriaDecorative</span></div>" +
  "<button style='display:none'>HiddenDisplay</button>" +
  "<button aria-label='HiddenVisibility' style='visibility:hidden'></button>";
const PRUNE_URL = `data:text/html,${encodeURIComponent(PRUNE_PAGE)}`;

test(
  "prune:true keeps visible+focusable aria-hidden elements (modal fix), drops genuinely hidden/decorative ones",
  { timeout: 120_000 },
  async () => {
    const sessions = new SessionManager();
    const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
    try {
      await session.page.goto(PRUNE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

      const unpruned = await captureSnapshot(session.page);
      const unprunedTexts = unpruned.map((e) => e.text).sort();
      assert.deepEqual(
        unprunedTexts,
        ["HiddenAriaDecorative", "HiddenAriaFocusable", "HiddenDisplay", "HiddenVisibility", "Visible"],
        "default (prune omitted) is byte-for-byte the pre-pruning behavior",
      );

      const pruned = await captureSnapshot(session.page, false, true);
      const prunedTexts = pruned.map((e) => e.text).sort();
      assert.deepEqual(
        prunedTexts,
        ["HiddenAriaFocusable", "Visible"],
        "prune:true keeps the visible+focusable aria-hidden button, drops the decorative/hidden ones",
      );
    } finally {
      await sessions.close(session.id);
    }
  },
);

// The exact bug report: a SPA marks a wrapper `aria-hidden="true"` that also
// wraps the open modal itself (not just the page behind it) — the modal's own
// interactive contents must survive prune:true, while a decoy hidden sibling
// under the same aria-hidden ancestor is still dropped.
const MODAL_PAGE =
  "<div aria-hidden='true'>" +
  "<dialog open><button>Action</button></dialog>" +
  "<button style='display:none'>GhostSibling</button>" +
  "</div>";
const MODAL_URL = `data:text/html,${encodeURIComponent(MODAL_PAGE)}`;

test(
  "prune:true keeps a visible+focusable button inside an aria-hidden-wrapped open dialog (the modal bug)",
  { timeout: 120_000 },
  async () => {
    const sessions = new SessionManager();
    const session = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
    try {
      await session.page.goto(MODAL_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

      const pruned = await captureSnapshot(session.page, false, true);
      assert.ok(pruned.length >= 1, "the dialog's interactive content should survive prune:true");
      assert.ok(
        pruned.some((e) => e.text === "Action"),
        "the visible+focusable dialog button must be kept even under an aria-hidden ancestor",
      );
      assert.ok(
        pruned.every((e) => e.text !== "GhostSibling"),
        "a display:none sibling under the same aria-hidden ancestor must still be pruned",
      );
    } finally {
      await sessions.close(session.id);
    }
  },
);
