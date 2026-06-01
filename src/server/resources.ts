/**
 * Expose the run artifacts directory as an MCP resource.
 * @module server/resources
 */
import { readdirSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const RUNS_DIR = "runs";
const RUNS_URI = "fuse-browser://runs";

function listRuns(): string[] {
  try {
    return readdirSync(RUNS_DIR);
  } catch {
    return [];
  }
}

/** Register a resource listing probe run artifacts (reports + screenshots). */
export function registerResources(server: McpServer): void {
  server.registerResource(
    "runs-index",
    RUNS_URI,
    {
      title: "Run artifacts",
      description: "Probe reports (JSON) and screenshots (PNG) produced under runs/.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(listRuns(), null, 2) },
      ],
    }),
  );
}
