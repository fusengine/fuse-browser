/**
 * Resolve agent options into an effective, normalized configuration.
 * @module agent/config
 */
import { join } from "node:path";
import { isRemoteCdp } from "../engine/cdp-url.js";
import { resolveIdentity, type ResolvedIdentity } from "../identity/resolve.js";
import type { BrowserChannel, EngineName } from "../interfaces/engine-types.js";
import type { CaptchaConfig, RetryConfig } from "../interfaces/net.js";
import type { AgentOptions } from "../interfaces/types.js";
import { ensureDir } from "../lib/fs.js";
import { resolveDefaultOutputDir } from "../lib/output-dir.js";
import { loadProxyCountryMap, type ProxySource, resolveProxy } from "../proxy/country-map.js";
import { acquirePoolProxy } from "../proxy/pool.js";

/** Effective configuration used by every probe run. */
export interface ResolvedConfig {
  outputDir: string;
  engine: EngineName;
  channel: BrowserChannel | null;
  executablePath: string | null;
  cdpEndpoint: string | null;
  cdpHeaders: Record<string, string> | null;
  cdpCloseOnDone: boolean;
  cdpTimeoutMs: number;
  storageStatePath: string | null;
  harPath: string | null;
  harMode: "minimal" | "full";
  harReplay: string | null;
  humanMode: boolean;
  headless: boolean;
  identity: ResolvedIdentity;
  currency: string;
  userDataDir: string | null;
  proxyUrl: string | null;
  proxySource: ProxySource;
  realisticProfile: boolean;
  respectRobots: boolean;
  replayEnabled: boolean;
  replayDir: string;
  siteMemoryDir: string;
  retry: RetryConfig;
  captcha: CaptchaConfig | null;
}

/** Build the resolved configuration, creating required directories. */
export function resolveConfig(opts: AgentOptions = {}): ResolvedConfig {
  const outputDir = opts.outputDir ?? resolveDefaultOutputDir();
  ensureDir(outputDir);
  const identity = resolveIdentity(opts);
  const map = loadProxyCountryMap(opts.proxyCountryMap, opts.proxyMapPath);
  let { proxyUrl, proxySource } = resolveProxy(opts.proxyUrl, identity.countryCode, map);
  if (!proxyUrl) {
    const pooled = acquirePoolProxy(opts.proxiesPath);
    if (pooled) {
      proxyUrl = pooled;
      proxySource = "pool";
    }
  }
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
    cdpHeaders: opts.cdpHeaders ?? null,
    cdpCloseOnDone: opts.cdpCloseOnDone ?? isRemoteCdp(opts.cdpEndpoint ?? ""),
    cdpTimeoutMs: opts.cdpTimeoutMs ?? 20_000,
    storageStatePath: opts.storageStatePath ?? null,
    harPath: opts.harPath ?? null,
    harMode: opts.harMode ?? "minimal",
    harReplay: opts.harReplay ?? null,
    humanMode: opts.humanMode ?? false,
    headless: opts.headless ?? true,
    identity,
    currency: identity.currency,
    userDataDir,
    proxyUrl,
    proxySource,
    realisticProfile: opts.realisticProfile ?? true,
    respectRobots: opts.respectRobots ?? false,
    replayEnabled: opts.replayEnabled ?? false,
    replayDir: opts.replayDir ?? join(outputDir, "replay"),
    siteMemoryDir,
    retry: {
      maxAttempts: opts.retry?.maxAttempts ?? 3,
      baseMs: opts.retry?.baseMs ?? 300,
      capMs: opts.retry?.capMs ?? 10_000,
      throttleMs: opts.retry?.throttleMs ?? 0,
    },
    captcha: opts.captcha ?? null,
  };
}
