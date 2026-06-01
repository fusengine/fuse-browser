/**
 * Load a proxy list from the `FUSE_PROXIES` env var (comma/newline separated)
 * and/or a JSON file (array of URLs). Dedupes and drops blanks. The proxy list
 * is a secret you provide — keep it out of the repo.
 * @module proxy/load
 */
import { readJsonSafe } from "../lib/fs.js";

/** Merge proxies from `env.FUSE_PROXIES` and an optional JSON file (array). */
export function loadProxyList(env: NodeJS.ProcessEnv = process.env, path?: string): string[] {
  const fromEnv = (env.FUSE_PROXIES ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const fromFile = path ? readJsonSafe<string[]>(path, []).map(String).filter(Boolean) : [];
  return [...new Set([...fromEnv, ...fromFile])];
}
