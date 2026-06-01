/**
 * `browser_extract_schema`: deterministic structured extraction by CSS selectors.
 * @module server/tools/extract-schema
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type ExtractionSchema, extractStructured } from "../../extraction/structured.js";
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
        "Extract typed data from the live page via a field map (field -> {selector, attr?, all?, abs?}). Deterministic; reads the rendered DOM, so it works on Next.js/SPA pages.",
      inputSchema: {
        sessionId: z.string(),
        schema: z.record(z.string(), fieldSpec),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const schema = a.schema as ExtractionSchema;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const data = await extractStructured(s.page, schema);
        return jsonResult({ url: s.page.url(), data });
      });
    },
  );
}
