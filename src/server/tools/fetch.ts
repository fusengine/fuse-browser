/**
 * `browser_fetch` tool: HTTP fast-path (browser TLS impersonation, no browser
 * launch). Returns status, LLM-ready markdown (or raw text), optional prices,
 * and optional structured contacts extracted from the fetched HTML.
 * @module server/tools/fetch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchAndRender } from "../../agent/fetch-orchestrate.js";
import { contactsFromHtml } from "../../extraction/contacts/from-html.js";
import { extractPrices } from "../../extraction/prices.js";
import { jsonResult } from "../result.js";
import { contactsSchema } from "./schemas-contacts-output.js";
import { renderedFetchSchema } from "./schemas-fetch-output.js";
import { priceSchema } from "./schemas-price-output.js";

/** `browser_fetch` output shape: a rendered fetch plus optional prices/contacts. */
export const FETCH_OUTPUT_SHAPE = {
  ...renderedFetchSchema.shape,
  prices: z.array(priceSchema).optional(),
  contacts: contactsSchema.optional(),
};

/** Register `browser_fetch`. */
export function registerFetchTool(server: McpServer): void {
  server.registerTool(
    "browser_fetch",
    {
      title: "HTTP fast fetch",
      description:
        'Fetch a URL with browser TLS/HTTP2 impersonation — NO browser launch, ~10x faster. Returns clean LLM-ready markdown by default (or raw text with format:"text"), plus wordCount/extraction signal ("primary"|"recovered") — markdown auto-recovers the raw page text when the extractor silently captured only a sliver of the page\'s real prose (e.g. some forum threads), while a genuinely sparse or link-heavy page (listing, login, 404) always keeps the clean extracted output; pass contentSelector to pin the main content container yourself when auto-detection still picks the wrong element. Also supports optional prices, and optional contacts (emails/phones/form) with extractContacts. Non-HTML responses (JSON APIs, plain text) are returned verbatim. For server-rendered HTML; set browserFallback:true to auto-render client-side (SPA/CSR) pages in a real browser when the HTTP response is an empty shell, OR when the fast-path extraction itself comes back empty on a chrome-heavy JS-rendered page (escalated:true marks either case). extractContacts collects personal data — ensure a lawful basis (GDPR/nLPD).',
      inputSchema: {
        url: z.string(),
        format: z.enum(["markdown", "text"]).optional(),
        contentSelector: z.string().optional(),
        extractPrices: z.boolean().optional(),
        extractContacts: z.boolean().optional(),
        contactFilter: z.enum(["strict", "off"]).optional(),
        countryCode: z.string().optional(),
        proxyUrl: z.string().optional(),
        maxChars: z.number().int().optional(),
        browserFallback: z.boolean().optional(),
      },
      outputSchema: FETCH_OUTPUT_SHAPE,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const proxyUrl = typeof a.proxyUrl === "string" ? a.proxyUrl : undefined;
      // Escalates to a real browser render when browserFallback is on and either
      // the raw HTML is an unrendered SPA shell, or the fast-path extraction came
      // back empty on a page carrying JS-rendering markers (fetch-orchestrate.ts).
      const { body, rendered } = await fetchAndRender(String(a.url), {
        browserFallback: a.browserFallback === true,
        proxyUrl,
        format: typeof a.format === "string" ? a.format : undefined,
        maxChars: typeof a.maxChars === "number" ? a.maxChars : undefined,
        contentSelector: typeof a.contentSelector === "string" ? a.contentSelector : undefined,
      });
      const country = typeof a.countryCode === "string" ? a.countryCode : "CH";
      const filter = a.contactFilter === "off" ? "off" : "strict";
      return jsonResult({
        ...rendered,
        prices: a.extractPrices ? extractPrices(body.text) : undefined,
        contacts: a.extractContacts ? contactsFromHtml(body.html, country, { url: body.url, filter }) : undefined,
      });
    },
  );
}
