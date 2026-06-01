/**
 * Resolve agent options into an effective, normalized configuration.
 * @module agent/config
 */
import { join } from "node:path";
import { resolveIdentity, type ResolvedIdentity } from "../identity/resolve.js";
import type { AgentOptions, BrowserChannel, EngineName } from "../interfaces/types.js";
import { ensureDir } from "../lib/fs.js";
import { loadProxyCountryMap, type ProxySource, resolveProxy } from "../proxy/country-map.js";

/** Effective configuration used by every probe run. */
export interface ResolvedConfig {
  outputDir: string;
  engine: EngineName;
  channel: BrowserChannel | null;
  executablePath: string | null;
  cdpEndpoint: string | null;
  storageStatePath: string | null;
  humanMode: boolean;
  headless: boolean;
  identity: ResolvedIdentity;
  currency: string;
  userDataDir: string | null;
  proxyUrl: string | null;
  proxySource: ProxySource;
  realisticProfile: boolean;
  replayEnabled: boolean;
  replayDir: string;
  siteMemoryDir: string;
}

/** Build the resolved configuration, creating required directories. */
export function resolveConfig(opts: AgentOptions = {}): ResolvedConfig {
  const outputDir = opts.outputDir ?? "runs";
  ensureDir(outputDir);
  const identity = resolveIdentity(opts);
  const map = loadProxyCountryMap(opts.proxyCountryMap, opts.proxyMapPath);
  const { proxyUrl, proxySource } = resolveProxy(opts.proxyUrl, identity.countryCode, map);
  const userDataDir = opts.userDataDir ?? null;
  if (userDataDir) ensureDir(userDataDir);
  const siteMemoryDir = opts.siteMemoryDir ?? join(outputDir, "site-memory");
  ensureDir(siteMemoryDir);
  return {
    outputDir,
    engine: opts.engine ?? "patchright",
    channel: opts.channel ?? null,
    executablePath: opts.executablePath ?? null,
    cdpEndpoint: opts.cdpEndpoint ?? null,
    storageStatePath: opts.storageStatePath ?? null,
    humanMode: opts.humanMode ?? false,
    headless: opts.headless ?? true,
    identity,
    currency: identity.currency,
    userDataDir,
    proxyUrl,
    proxySource,
    realisticProfile: opts.realisticProfile ?? true,
    replayEnabled: opts.replayEnabled ?? false,
    replayDir: opts.replayDir ?? join(outputDir, "replay"),
    siteMemoryDir,
  };
}
