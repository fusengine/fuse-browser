/**
 * Shared resolver for the fuse-browser home directory. Single source of
 * truth so profiles, vault, and sessions never re-declare the same logic.
 * @module lib/home
 */
import { homedir } from "node:os";
import { join } from "node:path";

/** Fuse-browser home dir (`FUSE_BROWSER_HOME` override, else `~/.fuse-browser`). */
export function fuseBrowserHome(): string {
  return process.env.FUSE_BROWSER_HOME ?? join(homedir(), ".fuse-browser");
}
