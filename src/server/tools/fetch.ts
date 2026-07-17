/**
 * `browser_fetch` tool: HTTP fast-path (browser TLS impersonation, no browser
 * launch). Returns status, LLM-ready markdown (or raw text), optional prices,
 * and optional structured contacts extracted from the fetched HTML.
 * @module server/tools/fetch
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { renderFetch } from "../../agent/fetch-render.js";
import { resolveFetchBody } from "../../agent/fetch-resolve.js";
import { contactsFromHtml } from "../../extraction/contacts/from-html.js";
import { extractPrices } from "../../extraction/prices.js";
import { fetchFast } from "../../net/fetch-fast.js";
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
      outputSchema: FETCH_OUTPUT_SHAPE,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const proxyUrl = typeof a.proxyUrl === "string" ? a.proxyUrl : undefined;
      const r = await fetchFast(String(a.url), proxyUrl);
      // Escalate an empty SPA shell to a real browser render when browserFallback is on.
      const body = await resolveFetchBody(String(a.url), r, { browserFallback: a.browserFallback === true, proxyUrl });
      const rendered = await renderFetch(body, {
        format: typeof a.format === "string" ? a.format : undefined,
        maxChars: typeof a.maxChars === "number" ? a.maxChars : undefined,
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
