/**
 * One-shot probe tools (parity with the original CLI/MCP).
 * @module server/tools/probe
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BrowserAgent } from "../../agent/browser-agent.js";
import { compactReport } from "../../agent/compact.js";
import { CircuitOpenError, GuardrailViolation } from "../../lib/errors.js";
import { toAgentOptions, toProbeOptions } from "../map-options.js";
import { errorResult, jsonResult } from "../result.js";
import { probeHtmlShape, probeShape } from "../schemas.js";

/** Register `browser_probe` and `browser_probe_html`. */
export function registerProbeTools(server: McpServer): void {
  server.registerTool(
    "browser_probe",
    {
      title: "Browser probe",
      description:
        "Open a real browser page and return text, screenshot path, network/console logs, optional prices, visual observation and challenge detection.",
      inputSchema: probeShape,
    },
    async (args) => {
      const raw = args as Record<string, unknown>;
      const agent = new BrowserAgent(toAgentOptions(raw));
      try {
        const report = await agent.probe(String(raw.url), toProbeOptions(raw));
        return jsonResult(compactReport(report));
      } catch (err) {
        if (err instanceof GuardrailViolation || err instanceof CircuitOpenError) return errorResult(err.message);
        throw err;
      }
    },
  );

  server.registerTool(
    "browser_probe_html",
    {
      title: "Browser probe HTML",
      description: "Probe an inline HTML fixture with the same engine. Useful for tests and dry-runs.",
      inputSchema: probeHtmlShape,
    },
    async (args) => {
      const raw = args as Record<string, unknown>;
      const agent = new BrowserAgent(toAgentOptions(raw));
      try {
        const report = await agent.probeHtml(String(raw.html), toProbeOptions(raw));
        return jsonResult(compactReport(report));
      } catch (err) {
        if (err instanceof GuardrailViolation) return errorResult(err.message);
        throw err;
      }
    },
  );
}
