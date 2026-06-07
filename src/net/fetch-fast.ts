/**
 * HTTP fast-path: fetch a URL with browser TLS/HTTP2 impersonation (impit) and
 * parse it server-side with linkedom — no browser launch. For server-rendered
 * HTML (price/index/SERP pages); JS/SPA pages still need `browser_probe`.
 * @module net/fetch-fast
 */
import { Impit } from "impit";
import { parseHTML } from "linkedom";
import { readCappedText } from "./read-body.js";
import { visibleText } from "./thin-shell.js";

/** Hard cap on the downloaded body — guards against decompression bombs / runaway streams. */
const MAX_DOWNLOAD_BYTES = 10_485_760; // 10 MB

/** Content negotiation: prefer markdown (served verbatim), then HTML. */
const ACCEPT = "text/markdown, text/html, application/xhtml+xml, */*";

let shared: Impit | null = null;
function client(proxyUrl?: string): Impit {
  if (proxyUrl) return new Impit({ browser: "chrome", proxyUrl });
  shared ??= new Impit({ browser: "chrome" });
  return shared;
}

/**
 * Extract readable body text from an HTML string (no browser, no layout).
 * linkedom's `body`/`documentElement` getters can THROW on rootless input, so
 * the access is guarded — a malformed body yields "" rather than crashing.
 */
export function htmlToText(html: string): string {
  try {
    const { document } = parseHTML(html);
    const text = (document.body?.textContent ?? document.documentElement?.textContent ?? "").trim();
    if (text) return text;
  } catch {
    /* fall through to the raw strip below */
  }
  return visibleText(html); // fragment / empty-body pages: recover text from raw HTML
}

/** MIME types linkedom/Defuddle can parse as markup. */
const HTML_MIME = new Set(["text/html", "application/xhtml+xml"]);

/**
 * Decide whether a `content-type` denotes HTML. Strips parameters (`; charset=…`)
 * and matches an exact MIME allowlist — `includes("html")` would wrongly match
 * payloads like `application/vnd.github.html+json`. An **empty** content-type is
 * treated as HTML: servers that omit it commonly serve HTML, and this preserves
 * the prior unconditional behavior.
 */
export function isHtmlContentType(contentType: string): boolean {
  if (contentType === "") return true;
  const mime = (contentType.split(";", 1)[0] ?? "").trim();
  return HTML_MIME.has(mime);
}

/** Result of a fast HTTP fetch. */
export interface FastResponse {
  status: number;
  url: string;
  html: string;
  text: string;
  /** Response `content-type` (lowercased, "" if absent). */
  contentType: string;
  /** Whether the body is HTML — drives markdown conversion vs. raw passthrough. */
  isHtml: boolean;
}

/**
 * Fetch `url` with Chrome impersonation; returns status, raw body, and body text.
 * Non-HTML payloads (JSON, plain text, …) are returned **verbatim** — running them
 * through the linkedom HTML parser would mangle them — so the fast-path also serves
 * JSON APIs. Callers must consult `isHtml` before any HTML→markdown conversion.
 */
export async function fetchFast(url: string, proxyUrl?: string): Promise<FastResponse> {
  const res = await client(proxyUrl).fetch(url, { headers: { Accept: ACCEPT } });
  const body = await readCappedText(res, MAX_DOWNLOAD_BYTES);
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  const isHtml = isHtmlContentType(contentType);
  // `text` is lazy + memoized: HTML→text parsing only runs if a consumer reads
  // it (e.g. extractPrices), so the common markdown path skips a linkedom parse.
  let textCache: string | undefined;
  return {
    status: res.status,
    url: res.url || url,
    html: body,
    contentType,
    isHtml,
    get text(): string {
      return (textCache ??= isHtml ? htmlToText(body) : body);
    },
  };
}
