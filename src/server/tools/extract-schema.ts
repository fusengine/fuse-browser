/**
 * `browser_extract_schema`: deterministic structured extraction by CSS selectors.
 * @module server/tools/extract-schema
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  type ExtractionSchema,
  extractStructured,
  extractStructuredPerCard,
} from "../../extraction/structured.js";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

const fieldSpec = z.object({
  selector: z.string(),
  attr: z.string().optional(),
  all: z.boolean().optional(),
  abs: z.boolean().optional(),
});

/** Register `browser_extract_schema`. */
export function registerExtractSchemaTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_extract_schema",
    {
      title: "Extract by schema",
      description:
        "Extract typed data from the live page via a field map (field -> {selector, attr?, all?, abs?}). Deterministic; reads the rendered DOM, so it works on Next.js/SPA pages. Pass `containerSelector` to extract CARD BY CARD: one record per matching container, every field resolved relative to it — so title/price/link stay correlated per card instead of returned as index-aligned parallel arrays.",
      inputSchema: {
        sessionId: z.string(),
        schema: z.record(z.string(), fieldSpec),
        containerSelector: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const schema = a.schema as ExtractionSchema;
      const container = typeof a.containerSelector === "string" ? a.containerSelector : undefined;
      return withSession(sessions, String(a.sessionId), async (s) => {
        if (container) {
          const items = await extractStructuredPerCard(s.page, container, schema);
          return jsonResult({ url: s.page.url(), count: items.length, items });
        }
        const data = await extractStructured(s.page, schema);
        return jsonResult({ url: s.page.url(), data });
      });
    },
  );
}
