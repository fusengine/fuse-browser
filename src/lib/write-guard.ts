/**
 * Optional confinement for caller-supplied write paths (`browser_screenshot`
 * `path`, `browser_pdf` `path`) — gated by `FUSE_CONFINE_WRITES=<root>`.
 * Default (env unset): a no-op, so the documented `"path": "/tmp/page.pdf"`
 * usage keeps writing wherever the caller asks, byte-identically.
 *
 * Canonicalization walks every path component left to right, resolving `..`
 * against the already symlink-resolved prefix instead of collapsing it
 * lexically first, and follows live or dangling symlinks at each step
 * (capped at 40 hops, rejected as a cycle beyond that); a confined write
 * additionally rejects any path containing a literal `..` segment outright,
 * as a second, independent layer. `writeConfinedBytes` then performs the
 * write itself via `O_NOFOLLOW` when confinement is active, refusing
 * outright (`ELOOP`) if the final path component is itself a symlink
 * (dangling or live) at write time — closing the check-then-write TOCTOU
 * window. `O_NOFOLLOW` is POSIX-only (Linux/macOS); a platform without it
 * falls back to a plain write (documented in docs/configuration.md).
 *
 * Deliberately NOT wired into `writeFileBytes` (`lib/fs.ts`): that helper also
 * serves auto-generated artifacts under `outputDir`, which confinement must
 * never break.
 * @module lib/write-guard
 */
import { closeSync, constants as fsConstants, mkdirSync, openSync, writeFileSync, writeSync } from "node:fs";
import { dirname, sep } from "node:path";
import { canonicalizePath } from "./canonicalize-path.js";

/** `O_NOFOLLOW` is undefined on platforms that don't define it (e.g. Windows). */
const NOFOLLOW_SUPPORTED = typeof fsConstants.O_NOFOLLOW === "number";

/** True when `canonicalTarget` is `canonicalRoot` itself or nested under it. A root of `/` matches every absolute path (no confinement). */
function isWithinRoot(canonicalTarget: string, canonicalRoot: string): boolean {
  const prefix = canonicalRoot === sep ? sep : canonicalRoot + sep;
  return canonicalTarget === canonicalRoot || canonicalTarget.startsWith(prefix);
}

/** True when any `sep`-delimited segment of `p` is a literal `..`. */
function hasDotDotSegment(p: string): boolean {
  return p.split(sep).includes("..");
}

/**
 * Validate `targetPath` against `FUSE_CONFINE_WRITES` (module doc above for
 * the algorithm). Returns `undefined` when confinement is off (env unset) or
 * `targetPath` resolves under the root — else an error message. A
 * canonicalization failure (e.g. a symlink cycle, `ELOOP`) is treated as a
 * rejection, never re-thrown. Validation only — call `writeConfinedBytes` to
 * perform the write and close the TOCTOU window between this check and it.
 */
export function checkWriteConfinement(targetPath: string): string | undefined {
  const root = process.env.FUSE_CONFINE_WRITES;
  if (!root) return undefined;
  if (hasDotDotSegment(targetPath)) {
    return `path "${targetPath}" contains a ".." segment, rejected outright under FUSE_CONFINE_WRITES`;
  }
  let canonicalRoot: string;
  let canonicalTarget: string;
  try {
    canonicalRoot = canonicalizePath(root);
    canonicalTarget = canonicalizePath(targetPath);
  } catch (err) {
    return `path "${targetPath}" could not be canonicalized: ${String(err)}`;
  }
  if (!isWithinRoot(canonicalTarget, canonicalRoot)) {
    return `path "${targetPath}" resolves outside the confined root "${root}" (FUSE_CONFINE_WRITES)`;
  }
  return undefined;
}

/**
 * Write `data` to `targetPath`. Callers MUST run `checkWriteConfinement`
 * first and reject on a truthy result — this function then performs the
 * write itself: when confinement is active (and `O_NOFOLLOW` is supported),
 * it opens with `O_NOFOLLOW`, so a symlink swapped in at the final path
 * component between the check and this call (dangling or live) throws
 * `ELOOP` instead of being followed. Throws on that race; callers should
 * report it as a rejected write.
 */
export function writeConfinedBytes(targetPath: string, data: Uint8Array): void {
  mkdirSync(dirname(targetPath), { recursive: true });
  if (!process.env.FUSE_CONFINE_WRITES || !NOFOLLOW_SUPPORTED) {
    writeFileSync(targetPath, data);
    return;
  }
  const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | fsConstants.O_NOFOLLOW;
  const fd = openSync(targetPath, flags, 0o666);
  try {
    writeSync(fd, data);
  } finally {
    closeSync(fd);
  }
}
