/**
 * `browser_products`: structured per-card product extraction for e-commerce and
 * listing pages. Returns one row per product (title linked to its own price),
 * solving the "flat prices with no title" gap of plain price scraping.
 * @module server/tools/products
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { extractProducts } from "../../extraction/products.js";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_products`. */
export function registerProductsTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_products",
    {
      title: "Extract product cards",
      description:
        "Extract structured product cards from an e-commerce / search-results page: one {title, price, currency, url?} per card, each price tied to its own title (unlike flat price scraping). Generic — detects repeated card containers by structure, so it works on Digitec, Booking, Amazon… Use it to answer 'which is the cheapest?' (sort by price), compare listings, or build a product table. Pass `containerSelector` to pin the card selector, `limit` to cap rows.",
      inputSchema: {
        sessionId: z.string(),
        limit: z.number().int().positive().optional(),
        containerSelector: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const products = await extractProducts(s.page, {
          limit: typeof a.limit === "number" ? a.limit : undefined,
          containerSelector: typeof a.containerSelector === "string" ? a.containerSelector : undefined,
        });
        return jsonResult({ url: s.page.url(), count: products.length, products });
      });
    },
  );
}
