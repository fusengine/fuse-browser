/**
 * Named persistent auth profiles: map a short profile name to the
 * storage-state JSON it lives in (`<home>/profiles/<name>.json`). The save
 * (session close / probe run) and load (configured context) cycle already
 * works on `storageStatePath`; profiles are just a friendly path resolver.
 * @module identity/profiles
 */
import { homedir } from "node:os";
import { join } from "node:path";

/** Allowed profile names: alnum start, then alnum/`-`/`_`, 1-41 chars. */
const PROFILE_NAME = /^[a-z0-9][a-z0-9_-]{0,40}$/i;

/** Fuse-browser home dir (`FUSE_BROWSER_HOME` override, else `~/.fuse-browser`). */
function fuseBrowserHome(): string {
  return process.env.FUSE_BROWSER_HOME ?? join(homedir(), ".fuse-browser");
}

/**
 * Resolve the storage-state file for a named auth profile.
 *
 * @param name - Profile name (letters/digits, then `-`/`_` allowed, max 41 chars).
 * @returns Absolute path `<home>/profiles/<name>.json`.
 * @throws Error when the name is empty or contains disallowed characters.
 */
export function profileStoragePath(name: string): string {
  if (!PROFILE_NAME.test(name)) {
    throw new Error(
      `Invalid profile name "${name}" — use 1-41 chars: letters/digits, then "-" or "_" (must start with a letter or digit).`,
    );
  }
  return join(fuseBrowserHome(), "profiles", `${name}.json`);
}
