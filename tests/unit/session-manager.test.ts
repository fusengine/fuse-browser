import { describe, expect, test } from "bun:test";
import { resolveConfig } from "../../src/agent/config.js";
import { SessionLimitError } from "../../src/lib/errors.js";
import { SessionManager } from "../../src/session/manager.js";
import type { SessionData } from "../../src/session/session.js";
import type { TtlGuard } from "../../src/session/ttl-guard.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Connected fake: closeSession() only tries browser?.close() — no Chromium needed. */
function fakeSession(id: string): SessionData {
  return {
    id,
    context: null,
    browser: null,
    page: null,
    config: resolveConfig({}),
    logs: null,
    connected: true,
    health: "ok",
    lastUrl: "",
    createdAt: Date.now(),
    expiresAt: Date.now(),
  } as unknown as SessionData;
}

/** Inject a session without launching a browser (mirrors open() bookkeeping). */
function inject(mgr: SessionManager, session: SessionData): void {
  const internals = mgr as unknown as { sessions: Map<string, SessionData>; guard: TtlGuard };
  internals.sessions.set(session.id, session);
  internals.guard.schedule(session.id);
}

// We only exercise the synchronous cap guard, which throws BEFORE any browser
// launch — so no real Chromium is needed here.
describe("SessionManager cap", () => {
  test("rejects past maxSessions before opening a browser", async () => {
    const mgr = new SessionManager({ maxSessions: 0 });
    await expect(mgr.open(resolveConfig({}))).rejects.toBeInstanceOf(SessionLimitError);
  });
});

describe("SessionManager busy TTL guard", () => {
  test("busy session survives TTL expiry, then closes once idle", async () => {
    const mgr = new SessionManager({ ttlMs: 50 });
    inject(mgr, fakeSession("busy"));
    mgr.markBusy("busy");
    await sleep(160); // > 3x TTL: timer fired but must reschedule, not close
    expect(mgr.list().map((s) => s.id)).toContain("busy");
    mgr.markIdle("busy"); // refreshes TTL; next expiry may close
    await sleep(160);
    expect(mgr.list()).toHaveLength(0);
  });

  test("explicit close() works even while busy", async () => {
    const mgr = new SessionManager({ ttlMs: 60_000 });
    inject(mgr, fakeSession("held"));
    mgr.markBusy("held");
    await expect(mgr.close("held")).resolves.toBe(true);
    expect(mgr.list()).toHaveLength(0);
  });

  test("markBusy/markIdle on an unknown id is a no-op", () => {
    const mgr = new SessionManager({ ttlMs: 50 });
    expect(() => {
      mgr.markBusy("ghost");
      mgr.markIdle("ghost");
    }).not.toThrow();
  });
});
