/**
 * Per-session download capture: every `download` event is saved under
 * `<outputDir>/downloads/` (deduplicated filename) and recorded in a buffer
 * keyed on the SessionData object via WeakMap — no session.ts wiring needed.
 * Playwright contexts accept downloads by default (`acceptDownloads: true`).
 * @module session/downloads
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Download, Page } from "playwright";
import { ensureDir } from "../lib/fs.js";
import type { SessionData } from "./session.js";

/** One captured download. */
export interface DownloadRecord {
  url: string;
  suggestedFilename: string;
  /** Saved path on disk; empty while saving or when `error` is set. */
  path: string;
  at: number;
  error?: string;
}

/** Internal per-session download state. */
interface DownloadState {
  records: DownloadRecord[];
  /** Pages already wired, for idempotent attachment (identity guard). */
  pages: WeakSet<Page>;
}

const states = new WeakMap<SessionData, DownloadState>();

/** Get or lazily create the state for a session. */
function stateFor(session: SessionData): DownloadState {
  let state = states.get(session);
  if (!state) {
    state = { records: [], pages: new WeakSet() };
    states.set(session, state);
  }
  return state;
}

/** Non-colliding path in `dir`: name.ext, then name-1.ext, name-2.ext, ... */
function dedupePath(dir: string, filename: string): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  let candidate = join(dir, filename);
  for (let i = 1; existsSync(candidate); i += 1) candidate = join(dir, `${stem}-${i}${ext}`);
  return candidate;
}

/** Save one download to disk and record the outcome. */
async function saveDownload(state: DownloadState, dir: string, download: Download): Promise<void> {
  const record: DownloadRecord = {
    url: download.url(),
    suggestedFilename: download.suggestedFilename(),
    path: "",
    at: Date.now(),
  };
  state.records.push(record);
  try {
    ensureDir(dir);
    const path = dedupePath(dir, download.suggestedFilename() || "download");
    await download.saveAs(path);
    record.path = path;
  } catch (err) {
    record.error = err instanceof Error ? err.message : String(err);
  }
}

/**
 * Wire the download handler onto the session's current page: each download is
 * saved to `<config.outputDir>/downloads/<suggestedFilename>` (suffixing -1,
 * -2 on name collisions) and recorded. Idempotent per page (identity guard).
 *
 * @param session - The live session whose `page` to watch.
 */
export function attachDownloads(session: SessionData): void {
  const state = stateFor(session);
  const page = session.page;
  if (state.pages.has(page)) return;
  state.pages.add(page);
  const dir = join(session.config.outputDir, "downloads");
  page.on("download", (download) => void saveDownload(state, dir, download));
}

/**
 * The downloads captured on this session (oldest first).
 *
 * @param session - The live session.
 */
export function listDownloads(session: SessionData): DownloadRecord[] {
  return [...stateFor(session).records];
}
