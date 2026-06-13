/**
 * Read the on-disk content of a captured download, resolving it by index or
 * filename. Bounds the read size so a huge file can't be slurped into a result.
 * @module session/download-read
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import type { DownloadRecord } from "./downloads.js";

/** Max bytes returned by a single read. */
export const MAX_READ_BYTES = 5 * 1024 * 1024;

/** Successful read payload. */
export interface DownloadContent {
  filename: string;
  encoding: "utf8" | "base64";
  data: string;
}

/** Read failure (resolution, missing file, or size cap). */
export interface DownloadReadError {
  error: string;
}

/** Resolve a download by numeric index or by suggestedFilename match. */
function resolve(records: DownloadRecord[], ref: number | string): DownloadRecord | undefined {
  if (typeof ref === "number") return records[ref];
  return records.find((r) => r.suggestedFilename === ref);
}

/**
 * Read a captured download's file by index or filename.
 *
 * @param records - The session's captured downloads (oldest first).
 * @param ref - Index into the list, or a `suggestedFilename` to match.
 * @param encoding - `"utf8"` (text) or `"base64"` (bytes). Defaults to utf8.
 * @returns The content, or an `{ error }` describing what went wrong.
 */
export function readDownload(
  records: DownloadRecord[],
  ref: number | string,
  encoding: "utf8" | "base64" = "utf8",
): DownloadContent | DownloadReadError {
  const record = resolve(records, ref);
  if (!record) return { error: `No download matching ${JSON.stringify(ref)}.` };
  if (!record.path || !existsSync(record.path)) {
    return { error: `Download "${record.suggestedFilename}" has no file on disk.` };
  }
  const size = statSync(record.path).size;
  if (size > MAX_READ_BYTES) {
    return { error: `File is ${size} bytes, over the ${MAX_READ_BYTES} byte read cap.` };
  }
  const data = readFileSync(record.path).toString(encoding);
  return { filename: record.suggestedFilename, encoding, data };
}
