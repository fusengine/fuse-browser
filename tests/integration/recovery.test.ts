/**
 * End-to-end tests for B1 crash recovery: a renderer crash flips the session
 * health flag, recoverSession heals the page in the same context (restoring the
 * last URL), and withSession transparently recovers before running a tool.
 * Real headless Chromium.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { SessionManager } from "../../src/session/manager.js";
import { recoverSession } from "../../src/session/recover.js";
import type { SessionData } from "../../src/session/session.js";
import { withSession } from "../../src/server/tools/with-session.js";
import { jsonResult } from "../../src/server/result.js";

const PAGE = "data:text/html,<h1>recover me</h1>";

/** Poll `session.health` until it matches `want` or the deadline elapses. */
async function waitForHealth(s: SessionData, want: string, ms = 10_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (s.health !== want && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.equal(s.health, want, `expected health "${want}", got "${s.health}"`);
}

/** Crash the renderer of the session's current page. */
async function crash(s: SessionData): Promise<void> {
  await s.page.goto("chrome://crash", { timeout: 5_000 }).catch(() => {});
  await waitForHealth(s, "crashed");
}

test("renderer crash flips health and recoverSession heals the page", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const s = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await s.page.goto(PAGE, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assert.equal(s.health, "ok");
    const firstPage = s.page;

    await crash(s);
    await recoverSession(s);

    assert.equal(s.health, "ok", "session should be healthy after recovery");
    assert.notEqual(s.page, firstPage, "a fresh page should replace the crashed one");
    assert.ok(!s.page.isClosed(), "recovered page should be usable");
    assert.match(await s.page.content(), /recover me/, "last URL should be restored");
  } finally {
    await sessions.close(s.id);
  }
});

test("withSession transparently recovers a page that crashed while idle", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const s = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await s.page.goto(PAGE, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await crash(s);

    const res = await withSession(sessions, s.id, async (live) =>
      jsonResult({ title: await live.page.title(), healed: live.health }),
    );

    assert.notEqual(res.isError, true, "withSession should heal, not error");
    const live = sessions.get(s.id);
    assert.equal(live.health, "ok", "session should be healthy for the tool body");
  } finally {
    await sessions.close(s.id).catch(() => {});
  }
});
