/**
 * Pure helpers to classify and validate a CDP endpoint URL.
 * @module engine/cdp-url
 */

/** True when the endpoint is a remote websocket (ws/wss) — e.g. Browserless. */
export function isRemoteCdp(endpoint: string): boolean {
  return /^wss?:\/\//i.test(endpoint.trim());
}

/** Validate a CDP endpoint protocol (http/https/ws/wss). Throws otherwise. */
export function assertCdpEndpoint(endpoint: string): void {
  if (!/^(https?|wss?):\/\//i.test(endpoint.trim())) {
    throw new Error(`Invalid cdpEndpoint protocol: "${endpoint}" (expected http(s):// or ws(s)://)`);
  }
}
