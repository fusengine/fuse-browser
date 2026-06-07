/**
 * Resolve the body for `browser_fetch`: return the HTTP fast-path result, or —
 * when `browserFallback` is set and the response looks like an unrendered SPA
 * shell — escalate to a real browser (Patchright) and return the rendered
 * HTML/text. This is how a single fetch call can "see everything", even on
 * client-rendered pages, without making the browser the default path.
 * @module agent/fetch-resolve
 */
import type { FastResponse } from "../net/fetch-fast.js";
import { isThinShell } from "../net/thin-shell.js";
import { BrowserAgent } from "./browser-agent.js";

/** A resolved fetch body, flagged when it required a browser render. */
export interface ResolvedBody {
  status: number;
  url: string;
  html: string;
  text: string;
  isHtml: boolean;
  /** True when the HTTP shell was escalated to a real browser render. */
  escalated: boolean;
}

/** Escalation toggle + proxy passed through to the browser. */
export interface ResolveOptions {
  browserFallback?: boolean;
  proxyUrl?: string;
}

/**
 * Return `r` as-is, or escalate to a browser render when it's a thin SPA shell.
 *
 * @param url - The URL to render if escalation triggers.
 * @param r - The HTTP fast-path response.
 * @param opts - Escalation toggle + proxy.
 * @returns The resolved body, with `escalated` set when a browser was used.
 */
export async function resolveFetchBody(url: string, r: FastResponse, opts: ResolveOptions = {}): Promise<ResolvedBody> {
  if (!opts.browserFallback || !isThinShell(r.html)) {
    return { status: r.status, url: r.url, html: r.html, text: r.text, isHtml: r.isHtml, escalated: false };
  }
  const report = await new BrowserAgent({ proxyUrl: opts.proxyUrl }).probe(url, { returnHtml: true });
  return { status: r.status, url: report.url, html: report.html ?? r.html, text: report.text, isHtml: true, escalated: true };
}
