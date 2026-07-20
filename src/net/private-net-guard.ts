/**
 * Optional SSRF guard for the HTTP fast-path (`browser_fetch`,
 * `browser_fetch_batch`, `browser_crawl` — all funnel through `fetchFast`),
 * gated by `FUSE_BLOCK_PRIVATE_NETS=1`. Default (unset): a no-op, so
 * `http://127.0.0.1:3000` (the core "fetch my dev server" workflow) keeps
 * working byte-identically. See CHANGELOG.md [Unreleased] for the summary.
 * Range/literal classification lives in `ip-ranges.ts` — this module owns
 * "when do we check, and against DNS or not".
 *
 * COVERAGE: every IP literal (v4 or v6; bracketed `[::1]`; IPv4-mapped IPv6
 * in dotted or hex form, e.g. `::ffff:127.0.0.1` / `::ffff:7f00:1`; decimal/
 * octal/hex-encoded IPv4; userinfo/case/short-form — all normalized by
 * `new URL()` before this guard ever sees them) is decided PURELY from the
 * parsed address: loopback, link-local, RFC1918, `0.0.0.0/8`,
 * `100.64.0.0/10` (CGNAT), `192.0.0.0/24`, IPv6 `::1` / `fe80::/10` /
 * `fc00::/7` / `::` (unspecified). A literal NEVER reaches DNS, so a DNS
 * throw can never be misread as "allow" for it (the historical bug here).
 *
 * NOT COVERED (honest residual gaps — not a footnote masking a bigger
 * hole): (1) a real, non-literal hostname is checked via one `dns.lookup`
 * pre-flight per call — a resolution separate from `impit`'s own internal
 * connect, so a low-TTL DNS-rebinding attack that changes the resolved
 * address between our lookup and impit's connection is not caught. (2)
 * `impit` exposes no per-redirect-hop hook or connected-IP accessor — only
 * the initial URL and the final `response.url` are checked — so a redirect
 * chain that transits a blocked private host mid-chain but lands on a
 * public URL is not caught.
 * @module net/private-net-guard
 */
import { lookup } from "node:dns/promises";
import { isIpLiteral, isPrivateIp, stripBrackets } from "./ip-ranges.js";

/** Thrown when a fetch target is blocked by `FUSE_BLOCK_PRIVATE_NETS=1`. */
export class PrivateNetworkBlockedError extends Error {
  readonly code = "blocked_private_network";
  constructor(message: string) {
    super(message);
    this.name = "PrivateNetworkBlockedError";
  }
}

/** Injectable shape of `dns/promises#lookup` (default param) — lets tests stub DNS without touching the real network or `mock.module` import-order pitfalls. */
export type LookupFn = (hostname: string) => Promise<{ address: string; family: number }>;

export { isPrivateIp };

/** True when `hostname` is a loopback/private literal (checked before DNS). Strips a trailing dot (a valid FQDN root-label separator, e.g. `"localhost."`) before comparing, else that form falls through to DNS and an unresolvable/failing lookup is allowed instead of blocked. */
function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return h === "localhost" || h.endsWith(".localhost") || isPrivateIp(h);
}

/** Env gate: `FUSE_BLOCK_PRIVATE_NETS=1` (anything else, including unset, is off). */
export function privateNetsBlocked(): boolean {
  return process.env.FUSE_BLOCK_PRIVATE_NETS === "1";
}

/**
 * Throws `PrivateNetworkBlockedError` when `url` targets a private/loopback/
 * link-local network and the guard is enabled; no-op otherwise (including
 * when the guard is off). An IP literal (v4/v6/bracketed/mapped) is decided
 * purely from the parsed address and NEVER reaches DNS. A real hostname
 * that fails DNS resolution is allowed through — the actual fetch attempt
 * surfaces its own connection error; this path is unreachable for a
 * literal. `lookupFn` defaults to the real `dns/promises#lookup`; tests
 * inject a fake to avoid live DNS.
 */
export async function assertNetworkAllowed(url: string, lookupFn: LookupFn = lookup): Promise<void> {
  if (!privateNetsBlocked()) return;
  const hostname = stripBrackets(new URL(url).hostname);
  if (isPrivateHostname(hostname)) {
    throw new PrivateNetworkBlockedError(`blocked_private_network: "${hostname}" is a private/loopback network`);
  }
  if (isIpLiteral(hostname)) return; // public IP literal: decided above, never DNS-resolved
  try {
    const { address } = await lookupFn(hostname);
    if (isPrivateIp(address)) {
      throw new PrivateNetworkBlockedError(`blocked_private_network: "${hostname}" resolves to private IP ${address}`);
    }
  } catch (err) {
    if (err instanceof PrivateNetworkBlockedError) throw err;
    /* DNS lookup failure for a real hostname: allow — the real fetch surfaces its own error */
  }
}
