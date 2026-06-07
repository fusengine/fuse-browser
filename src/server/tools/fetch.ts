/**
 * `browser_fetch` tool: HTTP fast-path (browser TLS impersonation, no browser
 * launch). Returns status, LLM-ready markdown (or raw text), optional prices,
 * and optional structured contacts extracted from the fetched HTML.
 * @module server/tools/fetch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveFetchBody } from "../../agent/fetch-resolve.js";
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
        'Fetch a URL with browser TLS/HTTP2 impersonation — NO browser launch, ~10x faster. Returns clean LLM-ready markdown by default (or raw text with format:"text"), optional prices, and optional contacts (emails/phones/form) with extractContacts. Non-HTML responses (JSON APIs, plain text) are returned verbatim. For server-rendered HTML; set browserFallback:true to auto-render client-side (SPA/CSR) pages in a real browser when the HTTP response is an empty shell (escalated:true marks such results). extractContacts collects personal data — ensure a lawful basis (GDPR/nLPD).',
      inputSchema: {
        url: z.string(),
        format: z.enum(["markdown", "text"]).optional(),
        extractPrices: z.boolean().optional(),
        extractContacts: z.boolean().optional(),
        contactFilter: z.enum(["strict", "off"]).optional(),
        countryCode: z.string().optional(),
        proxyUrl: z.string().optional(),
        maxChars: z.number().int().optional(),
        browserFallback: z.boolean().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const proxyUrl = typeof a.proxyUrl === "string" ? a.proxyUrl : undefined;
      const r = await fetchFast(String(a.url), proxyUrl);
      // Escalate an empty SPA shell to a real browser render when browserFallback is on.
      const body = await resolveFetchBody(String(a.url), r, { browserFallback: a.browserFallback === true, proxyUrl });
      const max = typeof a.maxChars === "number" ? a.maxChars : 20_000;
      // Non-HTML bodies (JSON, plain text) are returned raw — markdown extraction
      // only applies to HTML, so the fast-path also serves JSON APIs cleanly.
      const format = a.format === "text" || !body.isHtml ? "text" : "markdown";
      const text =
        format === "text"
          ? body.text.slice(0, max)
          : renderMarkdown(await htmlToMarkdown(body.html, { url: body.url }), max);
      const country = typeof a.countryCode === "string" ? a.countryCode : "CH";
      const filter = a.contactFilter === "off" ? "off" : "strict";
      return jsonResult({
        status: body.status,
        url: body.url,
        format,
        escalated: body.escalated,
        text,
        prices: a.extractPrices ? extractPrices(body.text) : undefined,
        contacts: a.extractContacts ? contactsFromHtml(body.html, country, { url: body.url, filter }) : undefined,
      });
    },
  );
}
