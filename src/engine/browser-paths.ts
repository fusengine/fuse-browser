/**
 * Platform-aware resolution of installed browser executables for
 * `browser_connect`. macOS uses fixed `.app` bundle paths; Linux resolves
 * common binary names via `PATH`; Windows probes standard install roots.
 * Every candidate is verified to exist on disk before being returned — never
 * a synthetic path handed straight to `spawn`.
 * @module engine/browser-paths
 */
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

/** Known `browser_connect` targets. */
export type BrowserName = "dia" | "chrome" | "edge" | "brave" | "arc";

/** Fixed macOS `.app` bundle binary paths. */
const MAC_APPS: Record<BrowserName, string> = {
  dia: "/Applications/Dia.app/Contents/MacOS/Dia",
  chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  edge: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  brave: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  arc: "/Applications/Arc.app/Contents/MacOS/Arc",
};

/** Linux binary names to probe on `PATH`, in priority order. */
const LINUX_BIN_NAMES: Record<BrowserName, readonly string[]> = {
  dia: [],
  chrome: ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"],
  edge: ["microsoft-edge", "microsoft-edge-stable"],
  brave: ["brave-browser", "brave"],
  arc: [],
};

/** Windows relative install paths, joined onto each root from `winRoots()`. */
const WIN_RELATIVE: Record<BrowserName, readonly string[]> = {
  dia: [],
  chrome: ["Google\\Chrome\\Application\\chrome.exe"],
  edge: ["Microsoft\\Edge\\Application\\msedge.exe"],
  brave: ["BraveSoftware\\Brave-Browser\\Application\\brave.exe"],
  arc: [],
};

/** Search each `PATH` directory for `name`; return the first existing match. */
function findOnPath(name: string): string | undefined {
  const dirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/** Windows install roots to probe, in priority order (only the set ones). */
function winRoots(): string[] {
  const env = process.env;
  const roots = [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA];
  return roots.filter((v): v is string => Boolean(v));
}

/**
 * Resolve `name` to an existing browser executable for `platform` (defaults
 * to `process.platform`). Returns every candidate tried, so a caller with no
 * match can build an actionable error listing what was checked.
 */
export function resolveBrowserBinary(
  name: BrowserName,
  platform: NodeJS.Platform = process.platform,
): { binary: string | null; tried: string[] } {
  const tried: string[] = [];
  if (platform === "darwin") {
    const p = MAC_APPS[name];
    tried.push(p);
    return { binary: existsSync(p) ? p : null, tried };
  }
  if (platform === "win32") {
    for (const root of winRoots()) {
      for (const rel of WIN_RELATIVE[name]) {
        const p = join(root, rel);
        tried.push(p);
        if (existsSync(p)) return { binary: p, tried };
      }
    }
    return { binary: null, tried };
  }
  for (const bin of LINUX_BIN_NAMES[name]) {
    tried.push(bin);
    const found = findOnPath(bin);
    if (found) return { binary: found, tried };
  }
  return { binary: null, tried };
}
