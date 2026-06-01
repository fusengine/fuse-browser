/**
 * End-to-end tests for session persistence: HAR recording (flushed on close)
 * and storageState auto-save/restore across sessions. Real headless Chromium.
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { SessionManager } from "../../src/session/manager.js";

test("records a HAR file flushed on session close", { timeout: 120_000 }, async () => {
  const har = join(mkdtempSync(join(tmpdir(), "fuse-har-")), "rec.har");
  const sessions = new SessionManager();
  const s = await sessions.open(resolveConfig({ headless: true, engine: "patchright", harPath: har }));
  await s.page.goto("data:text/html,<h1>hi</h1>", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await sessions.close(s.id);
  assert.ok(existsSync(har), "HAR file should be written on close");
  assert.ok(JSON.parse(readFileSync(har, "utf8")).log, "HAR should be valid (has log)");
});

test("auto-saves storageState on close and restores cookies on reopen", { timeout: 120_000 }, async () => {
  const ssp = join(mkdtempSync(join(tmpdir(), "fuse-state-")), "state.json");
  const sessions = new SessionManager();
  const cfg = () => resolveConfig({ headless: true, engine: "patchright", storageStatePath: ssp });

  const s1 = await sessions.open(cfg());
  await s1.context.addCookies([{ name: "sid", value: "abc123", url: "https://example.test" }]);
  await sessions.close(s1.id);
  assert.ok(existsSync(ssp), "storageState file should be written on close");
  assert.ok(
    JSON.parse(readFileSync(ssp, "utf8")).cookies.some((c: { name: string }) => c.name === "sid"),
    "saved state should contain the cookie",
  );

  const s2 = await sessions.open(cfg());
  const cookies = await s2.context.cookies("https://example.test");
  await sessions.close(s2.id);
  assert.ok(cookies.some((c) => c.name === "sid" && c.value === "abc123"), "cookie should be restored");
});
