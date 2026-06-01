/**
 * HTTP fast-path: fetch a URL with browser TLS/HTTP2 impersonation (impit) and
 * parse it server-side with linkedom — no browser launch. For server-rendered
 * HTML (price/index/SERP pages); JS/SPA pages still need `browser_probe`.
 * @module net/fetch-fast
 */
import { Impit } from "impit";
import { parseHTML } from "linkedom";

let shared: Impit | null = null;
function client(proxyUrl?: string): Impit {
  if (proxyUrl) return new Impit({ browser: "chrome", proxyUrl });
  shared ??= new Impit({ browser: "chrome" });
  return shared;
}

/** Extract readable body text from an HTML string (no browser, no layout). */
export function htmlToText(html: string): string {
  const { document } = parseHTML(html);
  return (document.body?.textContent ?? document.documentElement?.textContent ?? "").trim();
}

/** Result of a fast HTTP fetch. */
export interface FastResponse {
  status: number;
  url: string;
  html: string;
  text: string;
}

/** Fetch `url` with Chrome impersonation; returns status, raw html and body text. */
export async function fetchFast(url: string, proxyUrl?: string): Promise<FastResponse> {
  const res = await client(proxyUrl).fetch(url);
  const html = await res.text();
  return { status: res.status, url: (res as { url?: string }).url ?? url, html, text: htmlToText(html) };
}
