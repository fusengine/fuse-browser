/**
 * `browser_fetch` tool: HTTP fast-path (browser TLS impersonation, no browser
 * launch). Returns status, LLM-ready markdown (or raw text), optional prices,
 * and optional structured contacts extracted from the fetched HTML.
 * @module server/tools/fetch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { contactsFromHtml } from "../../extraction/contacts/from-html.js";
import { extractPrices } from "../../extraction/prices.js";
import { htmlToMarkdown, renderMarkdown } from "../../extraction/serialize/to-markdown.js";
import { fetchFast } from "../../net/fetch-fast.js";
import { jsonResult } from "../result.js";

/** Register `browser_fetch`. */
export function registerFetchTool(server: McpServer): void {
  server.registerTool(
    "browser_fetch",
    {
      title: "HTTP fast fetch",
      description:
        'Fetch a URL with browser TLS/HTTP2 impersonation — NO browser launch, ~10x faster. Returns clean LLM-ready markdown by default (or raw text with format:"text"), optional prices, and optional contacts (emails/phones/form) with extractContacts. Non-HTML responses (JSON APIs, plain text) are returned verbatim. For server-rendered HTML; use browser_probe for JS/SPA pages. extractContacts collects personal data — ensure a lawful basis (GDPR/nLPD).',
      inputSchema: {
        url: z.string(),
        format: z.enum(["markdown", "text"]).optional(),
        extractPrices: z.boolean().optional(),
        extractContacts: z.boolean().optional(),
        contactFilter: z.enum(["strict", "off"]).optional(),
        countryCode: z.string().optional(),
        proxyUrl: z.string().optional(),
        maxChars: z.number().int().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const r = await fetchFast(String(a.url), typeof a.proxyUrl === "string" ? a.proxyUrl : undefined);
      const max = typeof a.maxChars === "number" ? a.maxChars : 20_000;
      // Non-HTML bodies (JSON, plain text) are returned raw — markdown extraction
      // only applies to HTML, so the fast-path also serves JSON APIs cleanly.
      const format = a.format === "text" || !r.isHtml ? "text" : "markdown";
      const text =
        format === "text"
          ? r.text.slice(0, max)
          : renderMarkdown(await htmlToMarkdown(r.html, { url: r.url }), max);
      const country = typeof a.countryCode === "string" ? a.countryCode : "CH";
      const filter = a.contactFilter === "off" ? "off" : "strict";
      return jsonResult({
        status: r.status,
        url: r.url,
        format,
        text,
        prices: a.extractPrices ? extractPrices(r.text) : undefined,
        contacts: a.extractContacts ? contactsFromHtml(r.html, country, { url: r.url, filter }) : undefined,
      });
    },
  );
}
