/**
 * Disk-write validation for `browser_pdf`'s `path` option. Split out of
 * `pdf.ts` to keep it under the project's 100-line SOLID limit — mirrors
 * `screenshot-write.ts`'s contract for the same trait (arbitrary
 * caller-supplied local path, no implicit renaming).
 * @module server/tools/pdf-write
 */
import { extname } from "node:path";
import { checkWriteConfinement, writeConfinedBytes } from "../../lib/write-guard.js";

/** A rejected `path`: the error message plus its machine-readable code. */
export interface PdfPathRejection {
  message: string;
  code: string;
}

/**
 * Validate `path` before writing PDF bytes: the extension must be `.pdf`
 * (`pdf.ts` previously accepted any extension verbatim, unlike
 * `screenshot-write.ts`'s mime gate), and, only when `FUSE_CONFINE_WRITES` is
 * set, `path` must resolve under that root (a no-op by default). Returns the
 * rejection on failure, else `undefined`.
 */
export function validatePdfPath(path: string): PdfPathRejection | undefined {
  const ext = extname(path).toLowerCase();
  if (ext !== ".pdf") {
    return {
      message: `path extension "${ext || "(none)"}" does not match application/pdf output (expected .pdf)`,
      code: "path_extension_mismatch",
    };
  }
  const confineErr = checkWriteConfinement(path);
  if (confineErr) return { message: confineErr, code: "path_outside_confinement" };
  return undefined;
}

/**
 * Validate `path` (via `validatePdfPath`) and, only if it passes, write
 * `bytes` to disk. The write itself goes through `writeConfinedBytes`,
 * which refuses (via `O_NOFOLLOW`, when confinement is active) a symlink
 * swapped in at the final path component between the validation above and
 * this write — closing that TOCTOU window. Returns the rejection on
 * failure, else `undefined` once written.
 */
export function writePdfOrError(path: string, bytes: Buffer): PdfPathRejection | undefined {
  const rejection = validatePdfPath(path);
  if (rejection) return rejection;
  try {
    writeConfinedBytes(path, bytes);
  } catch (err) {
    return { code: "path_outside_confinement", message: `refused to write through a symlink at "${path}": ${String(err)}` };
  }
  return undefined;
}
