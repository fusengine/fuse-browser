/**
 * Option resolvers that need lookups, kept out of `agent/config` for size:
 * the proxy chain (explicit URL → country map → pool) and the storage-state
 * path (explicit path → named auth profile).
 * @module agent/config-defaults
 */
import { profileStoragePath } from "../identity/profiles.js";
import type { AgentOptions } from "../interfaces/types.js";
import { loadProxyCountryMap, type ProxySource, resolveProxy } from "../proxy/country-map.js";
import { acquirePoolProxy } from "../proxy/pool.js";

/**
 * Resolve the effective proxy: explicit `proxyUrl`, else the country-map entry
 * for the resolved country, else a proxy from the fallback pool.
 *
 * @param opts - Agent options (proxy fields).
 * @param countryCode - Resolved identity country code.
 * @returns Proxy URL (or null) plus its provenance.
 */
export function resolveProxyChain(
  opts: AgentOptions,
  countryCode: string,
): { proxyUrl: string | null; proxySource: ProxySource } {
  const map = loadProxyCountryMap(opts.proxyCountryMap, opts.proxyMapPath);
  const resolved = resolveProxy(opts.proxyUrl, countryCode, map);
  if (resolved.proxyUrl) return resolved;
  const pooled = acquirePoolProxy(opts.proxiesPath);
  if (pooled) return { proxyUrl: pooled, proxySource: "pool" };
  return resolved;
}

/**
 * Resolve the storage-state path: an explicit `storageStatePath` beats a
 * named auth `profile` (`~/.fuse-browser/profiles/<name>.json`).
 *
 * @param opts - Agent options (`storageStatePath`, `profile`).
 * @returns The effective storage-state path, or null.
 */
export function resolveStorageStatePath(opts: AgentOptions): string | null {
  if (opts.storageStatePath) return opts.storageStatePath;
  return opts.profile ? profileStoragePath(opts.profile) : null;
}
