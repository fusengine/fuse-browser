import { describe, expect, test } from "bun:test";
import { resolveConfig } from "../../src/agent/config.js";
import { SessionLimitError } from "../../src/lib/errors.js";
import { SessionManager } from "../../src/session/manager.js";

// We only exercise the synchronous cap guard, which throws BEFORE any browser
// launch — so no real Chromium is needed here.
describe("SessionManager cap", () => {
  test("rejects past maxSessions before opening a browser", async () => {
    const mgr = new SessionManager({ maxSessions: 0 });
    await expect(mgr.open(resolveConfig({}))).rejects.toBeInstanceOf(SessionLimitError);
  });
});
