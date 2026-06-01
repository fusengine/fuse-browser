/**
 * Rotating in-memory proxy pool: round-robin `acquire` skipping cooled-down
 * entries; `reportBlocked` puts an entry on cooldown (it re-enters rotation
 * automatically once the cooldown elapses — entries are never removed).
 * @module proxy/pool
 */
import { loadProxyList } from "./load.js";

interface ProxyEntry {
  url: string;
  cooldownUntil: number;
}

/** Round-robin proxy pool with per-entry cooldown on block. */
export class ProxyPool {
  private readonly entries: ProxyEntry[];
  private cursor = 0;

  constructor(
    urls: string[],
    private readonly cooldownMs = 5 * 60_000,
    private readonly now: () => number = Date.now,
  ) {
    this.entries = urls.map((url) => ({ url, cooldownUntil: 0 }));
  }

  /** Next available proxy (round-robin), or null when all are cooling/empty. */
  acquire(): string | null {
    const t = this.now();
    const n = this.entries.length;
    for (let i = 0; i < n; i += 1) {
      const e = this.entries[(this.cursor + i) % n];
      if (e && t >= e.cooldownUntil) {
        this.cursor = (this.cursor + i + 1) % n;
        return e.url;
      }
    }
    return null;
  }

  /** Put a proxy on cooldown after a block (403/429/captcha). */
  reportBlocked(url: string): void {
    const e = this.entries.find((x) => x.url === url);
    if (e) e.cooldownUntil = this.now() + this.cooldownMs;
  }

  /** Count of currently-available (not cooling) proxies. */
  get available(): number {
    const t = this.now();
    return this.entries.filter((e) => t >= e.cooldownUntil).length;
  }

  /** Total pool size. */
  get size(): number {
    return this.entries.length;
  }
}

let singleton: ProxyPool | null = null;

/** Lazily-built process-wide pool from `FUSE_PROXIES` env + optional JSON file. */
export function defaultProxyPool(proxiesPath?: string): ProxyPool {
  if (!singleton) singleton = new ProxyPool(loadProxyList(process.env, proxiesPath));
  return singleton;
}

/** Acquire from the default pool; null if none configured or all cooling. */
export function acquirePoolProxy(proxiesPath?: string): string | null {
  return defaultProxyPool(proxiesPath).acquire();
}

/** Report a block to the default pool (puts that proxy on cooldown). */
export function reportProxyBlocked(url: string): void {
  defaultProxyPool().reportBlocked(url);
}
