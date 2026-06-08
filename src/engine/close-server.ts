/**
 * Hardened shutdown for a launchServer-backed browser: attempt a graceful close,
 * but SIGKILL the browser process if it stalls. A graceful close can hang
 * indefinitely on a loaded host, leaving zombie Chromium processes that pile up
 * over long uptimes; the kill fallback guarantees the process is reaped.
 * @module engine/close-server
 */
/** Grace period for `server.close()` before force-killing the process (ms). */
const CLOSE_TIMEOUT_MS = 8_000;

/**
 * Minimal server surface needed for shutdown: a graceful close plus a force
 * kill. Playwright's `BrowserServer` satisfies this structurally; narrowing to
 * it keeps the helper testable without a real browser (Interface Segregation).
 */
export interface ClosableServer {
  /** Gracefully close the browser; resolves once its process has terminated. */
  close(): Promise<void>;
  /** Force-kill the browser process group. */
  kill(): Promise<void>;
}

/**
 * Gracefully close `server`, force-killing its process if close stalls.
 * Never throws: a late `close()` rejection is pre-handled (no unhandled
 * rejection) and `kill()` swallows the already-dead case.
 *
 * @param server - The browser server to shut down.
 * @param timeoutMs - Grace period before SIGKILL (default 8000).
 */
export async function closeServerHardened(
  server: ClosableServer,
  timeoutMs = CLOSE_TIMEOUT_MS,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  // Attach handlers up-front so a late close() rejection never goes unhandled.
  const closed = server.close().then(
    () => "closed" as const,
    () => "closed" as const,
  );
  try {
    if ((await Promise.race([closed, timeout])) === "timeout") {
      await server.kill().catch(() => {});
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}
