/**
 * Expose run artifacts and live-session screenshots as MCP resources.
 * @module server/resources
 */
import { readdirSync } from "node:fs";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import type { SessionManager } from "../session/manager.js";
import { captureSessionScreenshot, isSessionMissing } from "./resource-screenshot.js";

const RUNS_DIR = "runs";
const RUNS_URI = "fuse-browser://runs";

function listRuns(): string[] {
  try {
    return readdirSync(RUNS_DIR);
  } catch {
    return [];
  }
}

/** Register the static runs-index resource. */
function registerRunsIndex(server: McpServer): void {
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
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(listRuns()) },
      ],
    }),
  );
}

/** Build the dynamic-screenshot resource template (lists every live session). */
function screenshotTemplate(sessions: SessionManager): ResourceTemplate {
  return new ResourceTemplate("screenshot://{sessionId}/last", {
    list: async () => ({
      resources: sessions.list().map((s) => ({
        uri: `screenshot://${s.id}/last`,
        name: `Session ${s.id} (last view)`,
        mimeType: "image/jpeg",
      })),
    }),
  });
}

/** Register the `screenshot://{sessionId}/last` JPEG resource. */
function registerScreenshot(server: McpServer, sessions: SessionManager): void {
  server.registerResource(
    "session-screenshot",
    screenshotTemplate(sessions),
    {
      title: "Session screenshot",
      description: "Live JPEG of a session's current page, captured on read.",
      mimeType: "image/jpeg",
    },
    async (uri, { sessionId }): Promise<ReadResourceResult> => {
      const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;
      try {
        return await captureSessionScreenshot(sessions, String(id), uri.href);
      } catch (error) {
        if (isSessionMissing(error)) {
          throw new Error(`No live session for id "${id}"`);
        }
        throw error;
      }
    },
  );
}

/** Register run-artifact and live-session-screenshot resources. */
export function registerResources(server: McpServer, sessions: SessionManager): void {
  registerRunsIndex(server);
  registerScreenshot(server, sessions);
}
