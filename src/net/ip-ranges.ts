/**
 * Pure IP-literal parsing and range classification for `private-net-guard.ts`.
 * Split out to keep both files under the project's 100-line SOLID limit —
 * this module owns "is this address private", the guard owns "when do we
 * check, and against DNS or not".
 * @module net/ip-ranges
 */
import { isIP } from "node:net";

const V4_PRIVATE_PREFIXES = ["10.", "192.168.", "127."];

/** Strip a URL hostname's IPv6 brackets — `new URL().hostname` keeps them (e.g. `"[::1]"`); `isIP`/range checks need the bare address. */
export function stripBrackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

/** True when `ip` (dotted-decimal v4) is loopback/RFC1918/link-local/`0.0.0.0/8`/CGNAT/IETF-reserved. */
function isV4Private(ip: string): boolean {
  if (V4_PRIVATE_PREFIXES.some((p) => ip.startsWith(p))) return true;
  if (ip.startsWith("169.254.") || ip.startsWith("192.0.0.")) return true;
  const parts = ip.split(".").map(Number);
  const a = parts[0];
  const b = parts[1];
  if (a === undefined || b === undefined) return false;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 0) return true; // 0.0.0.0/8 — the literal 0.0.0.0 routes to localhost on Linux
  return a === 100 && b >= 64 && b <= 127; // 100.64.0.0/10 (CGNAT, RFC 6598)
}

function isV6Private(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback + unspecified
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 (ULA)
  const firstHextet = lower.split(":", 1)[0];
  if (!firstHextet) return false;
  const v = Number.parseInt(firstHextet, 16);
  return v >= 0xfe80 && v <= 0xfebf; // fe80::/10 (link-local) — full range, not just the "fe80" literal
}

/** Extract the embedded IPv4 from an IPv4-mapped IPv6 literal (`::ffff:a.b.c.d` dotted or `::ffff:HHHH:HHHH` hex); `undefined` if not one. */
function unwrapV4Mapped(ip: string): string | undefined {
  const lower = ip.toLowerCase();
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  const dottedIp = dotted?.[1];
  if (dottedIp) return dottedIp;
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  const hiHex = hex?.[1];
  const loHex = hex?.[2];
  if (hiHex && loHex) {
    const hi = Number.parseInt(hiHex, 16);
    const lo = Number.parseInt(loHex, 16);
    return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  }
  return undefined;
}

/** True when `ip` (v4 or v6 literal, brackets already stripped) is loopback/link-local/private. */
export function isPrivateIp(ip: string): boolean {
  const mapped = unwrapV4Mapped(ip);
  if (mapped) return isV4Private(mapped);
  if (isIP(ip) === 4) return isV4Private(ip);
  if (isIP(ip) === 6) return isV6Private(ip);
  return false;
}

/** True when `hostname` (bracket-stripped) is any recognized IP literal, mapped or not — a literal must decide purely on itself and never reach DNS. */
export function isIpLiteral(hostname: string): boolean {
  return isIP(hostname) !== 0 || unwrapV4Mapped(hostname) !== undefined;
}
