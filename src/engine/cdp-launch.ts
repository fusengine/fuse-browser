/**
 * Launch an installed browser with a remote-debugging port, detached, then
 * poll its CDP endpoint until ready. Powers `browser_connect` so an agent can
 * attach to the user's real browser (Chrome/Edge/Dia/Arc) without manual setup.
 *
 * SECURITY: opening a remote-debugging port binds a CDP server on localhost.
 * Any local process can then connect and fully control the browser (read
 * cookies/sessions, execute JS). Use a dedicated `userDataDir` for automation,
 * never bind to 0.0.0.0, and treat the port as a local attack surface.
 * @module engine/cdp-launch
 */
import { spawn } from "node:child_process";
import { logger } from "../lib/logger.js";

/** Result of a `spawnBrowser` attempt: whether the child process started. */
export type SpawnResult = { ok: true } | { ok: false; error: string };

/**
 * Spawn a browser binary with remote debugging, fully detached from the parent.
 * Runs without a shell (no shell injection); `binary`/`userDataDir` are passed
 * as native argv. The opened debug port is a local attack surface (see module).
 *
 * A `child.on("error", ...)` handler is attached BEFORE `unref()` so an ENOENT
 * (bad binary path) never surfaces as an unhandled `error` event — which would
 * otherwise crash the whole process (and, for the stdio MCP server, kill every
 * tool for the session). The handler settles the returned promise with a
 * structured failure instead. A short `setImmediate` grace period lets that
 * (typically next-tick) failure surface before we optimistically resolve
 * success, so callers fail fast rather than sitting through the full
 * `waitForCdp` polling timeout on a binary that never started.
 */
export function spawnBrowser(binary: string, port: number, userDataDir?: string): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const args = [`--remote-debugging-port=${port}`, "--no-first-run", "--no-default-browser-check"];
    if (userDataDir) args.push(`--user-data-dir=${userDataDir}`);
    const child = spawn(binary, args, { detached: true, stdio: "ignore" });
    let settled = false;
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      logger.error("failed to spawn browser", { binary, port, error: String(err) });
      resolve({ ok: false, error: err.message });
    });
    setImmediate(() => {
      if (settled) return;
      settled = true;
      child.unref();
      logger.info("spawned browser for CDP", { binary, port });
      resolve({ ok: true });
    });
  });
}

/** Poll http://localhost:PORT/json/version until it responds or retries run out. */
export async function waitForCdp(port: number, retries = 25, intervalMs = 300): Promise<string> {
  const url = `http://localhost:${port}/json/version`;
  for (let i = 0; i < retries; i += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1_000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return url.replace("/json/version", "");
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`CDP endpoint not ready on port ${port} after ${retries} attempts`);
}
