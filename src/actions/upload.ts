/**
 * File upload action: set local file paths on an `<input type="file">` via
 * Playwright's `setInputFiles`. Shared by `performAction` (run steps) and the
 * snapshot `browser_act` ref/target path.
 * @module actions/upload
 */
import type { Locator, Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";

/** A `files` field: one path, a CSV of paths, or an explicit array of paths. */
export type FilesInput = string | string[];

/**
 * Normalize a `files` field into a clean path list. A comma-containing string is
 * split into several paths; whitespace is trimmed and empty entries dropped.
 *
 * @param files - One path, a comma-separated string, or an array of paths.
 * @returns The de-blanked list of file paths.
 */
export function normalizeFiles(files: FilesInput): string[] {
  const raw = Array.isArray(files) ? files : String(files).split(",");
  return raw.map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Set `files` on an already-resolved `<input type="file">` locator.
 *
 * @param locator - Locator pointing at the file input.
 * @param files - Paths to upload (string, CSV string, or array).
 * @returns Action result; `ok:false` with `error` on failure or no files.
 */
export async function setFiles(locator: Locator, files: FilesInput): Promise<ActionResult> {
  const paths = normalizeFiles(files);
  if (paths.length === 0) return { type: "upload", ok: false, error: "no_files" };
  try {
    await locator.setInputFiles(paths, { timeout: 10_000 });
    return { type: "upload", ok: true, files: paths };
  } catch (err) {
    return { type: "upload", ok: false, files: paths, error: String(err).split("\n")[0] ?? "error" };
  }
}

/**
 * Resolve `target` to its first matching input and upload `files` onto it.
 *
 * @param page - Active Playwright page.
 * @param target - Selector for the file input.
 * @param files - Paths to upload (string, CSV string, or array).
 * @returns Action result tagged with the `target`.
 */
export async function uploadFiles(page: Page, target: string, files: FilesInput): Promise<ActionResult> {
  if (!target) return { type: "upload", ok: false, error: "no_target" };
  return { ...(await setFiles(page.locator(target).first(), files)), target };
}
