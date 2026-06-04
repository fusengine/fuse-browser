/**
 * Best-effort: open a URL in the OS default browser. Never throws.
 * @module live/open-url
 */
import { spawn } from "node:child_process";

/** Spawn the platform opener for `url`, detached; failures are ignored. */
export function openUrl(url: string): void {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* best-effort: the URL is also returned to the caller */
  }
}
