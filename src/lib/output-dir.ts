/**
 * Resolve a safe default output directory, nested under the host agent's
 * project config dir (`.claude`, `.cursor`, …) when present, otherwise under
 * `$HOME`. Keeps probe artifacts (reports, screenshots, cookies) out of the
 * repository root so they are never committed by accident.
 * @module lib/output-dir
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Project-root config dirs of common AI coding agents, by preference. */
export const AGENT_DIRS = [
  ".claude",
  ".cursor",
  ".codex",
  ".windsurf",
  ".gemini",
  ".continue",
  ".junie",
  ".github",
];

/**
 * Pick the default output dir: `<agent-dir>/fuse-browser` when a known agent
 * config dir exists in `cwd`, otherwise `~/.fuse-browser`.
 *
 * @param cwd - Directory scanned for an agent config dir (defaults to process cwd).
 * @param home - Home directory used for the fallback (defaults to OS home).
 * @returns The chosen output directory path.
 */
export function resolveDefaultOutputDir(
  cwd: string = process.cwd(),
  home: string = homedir(),
): string {
  for (const dir of AGENT_DIRS) {
    if (existsSync(join(cwd, dir))) return join(cwd, dir, "fuse-browser");
  }
  return join(home, ".fuse-browser");
}
