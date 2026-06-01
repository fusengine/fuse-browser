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

/** Default macOS binary paths for common Chromium browsers. */
export const KNOWN_BROWSERS: Record<string, string> = {
  dia: "/Applications/Dia.app/Contents/MacOS/Dia",
  chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  edge: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  brave: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  arc: "/Applications/Arc.app/Contents/MacOS/Arc",
};

/**
 * Spawn a browser binary with remote debugging, fully detached from the parent.
 * Runs without a shell (no shell injection); `binary`/`userDataDir` are passed
 * as native argv. The opened debug port is a local attack surface (see module).
 */
export function spawnBrowser(binary: string, port: number, userDataDir?: string): void {
  const args = [`--remote-debugging-port=${port}`, "--no-first-run", "--no-default-browser-check"];
  if (userDataDir) args.push(`--user-data-dir=${userDataDir}`);
  const child = spawn(binary, args, { detached: true, stdio: "ignore" });
  child.unref();
  logger.info("spawned browser for CDP", { binary, port });
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
