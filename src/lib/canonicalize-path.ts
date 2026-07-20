/**
 * Symlink-aware path canonicalization for `write-guard.ts`'s confinement
 * check. Walks every path component LEFT TO RIGHT against the
 * already-resolved prefix built so far, so `..` pops the last REAL
 * (post-symlink) segment instead of being collapsed lexically before the
 * walk starts — `node:path#resolve`/`join` both normalize `..` on the raw
 * string with no filesystem access at all, which is wrong the moment an
 * earlier component was a symlink: a symlinked directory's `..` must
 * resolve relative to the symlink's TARGET parent, not the symlink's own
 * lexical parent. A dangling symlink (target does not exist) is still
 * detected and its target resolved — `existsSync` follows symlinks and
 * reports a dangling one as "doesn't exist", letting a naive walk skip
 * straight past it.
 * @module lib/canonicalize-path
 */
import { lstatSync, readlinkSync } from "node:fs";
import { dirname, isAbsolute, sep } from "node:path";

/** Guards against a symlink cycle (`a` -> `b` -> `a`); exceeding it is a rejection, not a silent stop. */
const MAX_SYMLINK_HOPS = 40;

/** Resolve a symlink's link value against the directory containing the link itself. */
function resolveLinkTarget(linkPath: string, target: string): string {
  return isAbsolute(target) ? target : `${dirname(linkPath)}${sep}${target}`;
}

/** Render a resolved-component list back to an absolute path string. */
function toAbsolute(parts: readonly string[]): string {
  return parts.length ? sep + parts.join(sep) : sep;
}

/**
 * Canonicalize `path` against the real filesystem, resolving every symlink
 * encountered while walking left to right — including a symlink whose
 * target does not exist (dangling), whose target is still resolved and
 * returned so the caller can validate it against a confinement root. Never
 * throws on a missing component; the remaining (non-existent) tail is
 * appended literally, exactly like the target file of a screenshot/PDF
 * write that does not exist yet. A `..` (anywhere in the input, including
 * inside a non-existent tail) pops the last already-resolved segment — it
 * is applied AFTER symlink resolution of everything to its left, never
 * collapsed lexically against the raw input string (the fix for the
 * `root/livedir/../outside` escape, where `livedir` is a symlink out of
 * the root). Throws `Error("ELOOP…")` on a symlink chain exceeding
 * `MAX_SYMLINK_HOPS` (cycle guard) instead of silently treating the link
 * as a literal path segment.
 */
export function canonicalizePath(path: string, hops = 0): string {
  const rawAbsolute = isAbsolute(path) ? path : `${process.cwd()}${sep}${path}`;
  const inputParts = rawAbsolute.split(sep).filter(Boolean);
  const resolved: string[] = [];
  let onDisk = true;

  for (let i = 0; i < inputParts.length; i++) {
    const part = inputParts[i];
    if (!part || part === ".") continue;
    if (part === "..") {
      resolved.pop();
      continue;
    }
    if (!onDisk) {
      resolved.push(part);
      continue;
    }
    const candidate = toAbsolute([...resolved, part]);
    let isSymlink = false;
    let linkTarget = "";
    try {
      const st = lstatSync(candidate);
      isSymlink = st.isSymbolicLink();
      if (isSymlink) linkTarget = readlinkSync(candidate);
    } catch {
      // Component doesn't exist: the rest of the path is a non-existent
      // tail — still honor `.`/`..` in it (handled by the loop above),
      // just without touching disk again (a child of a non-existent
      // directory cannot itself exist).
      onDisk = false;
      resolved.push(part);
      continue;
    }
    if (isSymlink) {
      if (hops >= MAX_SYMLINK_HOPS) {
        throw new Error(`ELOOP: too many symlink hops resolving "${path}"`);
      }
      const target = resolveLinkTarget(candidate, linkTarget);
      const resolvedTarget = canonicalizePath(target, hops + 1);
      const restParts = inputParts.slice(i + 1);
      const rest = restParts.length ? sep + restParts.join(sep) : "";
      return canonicalizePath(`${resolvedTarget}${rest}`, hops + 1);
    }
    resolved.push(part);
  }
  return toAbsolute(resolved);
}
