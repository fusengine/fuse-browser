/**
 * Extraction tool for a live session: text / prices / hotels / challenges.
 * Text is returned as LLM-ready markdown by default; `format:"text"` for raw.
 * @module server/tools/extract
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { detectChallenges } from "../../extraction/challenges.js";
import { extractHotelOffers } from "../../extraction/hotel-offers.js";
import { mainText } from "../../extraction/main-text.js";
import { extractPrices } from "../../extraction/prices.js";
import { htmlToMarkdown, renderMarkdown } from "../../extraction/serialize/to-markdown.js";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

const KIND = z.enum(["text", "prices", "hotels", "challenges", "all"]);

/** Register `browser_extract`. */
export function registerExtractTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_extract",
    {
      title: "Extract",
      description:
        'Extract text, prices, hotel offers and/or challenges from the live page. Text is clean LLM-ready markdown by default; pass format:"text" for raw innerText.',
      inputSchema: {
        sessionId: z.string(),
        kind: KIND.optional(),
        format: z.enum(["markdown", "text"]).optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const kind = (a.kind as string) ?? "all";
      const format = a.format === "text" ? "text" : "markdown";
      return withSession(sessions, String(a.sessionId), async (s) => {
        const text = await mainText(s.page);
        const out: Record<string, unknown> = { url: s.page.url() };
        if (kind === "text" || kind === "all") {
          out.text =
            format === "text"
              ? text
              : renderMarkdown(await htmlToMarkdown(await s.page.content(), { url: s.page.url() }));
        }
        if (kind === "prices" || kind === "all") {
          out.prices = extractPrices(text);
          out.hotelOffers = extractHotelOffers(text);
        }
        if (kind === "hotels") out.hotelOffers = extractHotelOffers(text);
        if (kind === "challenges" || kind === "all") out.challenges = await detectChallenges(s.page, text);
        return jsonResult(out);
      });
    },
  );
}
