/**
 * Build the MCP server with all tools and resources registered.
 * @module server/server
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VERSION } from "../lib/version.js";
import { SessionManager } from "../session/manager.js";
import { registerResources } from "./resources.js";
import { registerActTools } from "./tools/act.js";
import { registerConnectTool } from "./tools/connect.js";
import { registerExtractTool } from "./tools/extract.js";
import { registerExtractSchemaTool } from "./tools/extract-schema.js";
import { registerNavigateTool } from "./tools/navigate.js";
import { registerProbeTools } from "./tools/probe.js";
import { registerSerpBatchTool } from "./tools/serp-batch.js";
import { registerRunTool } from "./tools/run.js";
import { registerScreenshotTool } from "./tools/screenshot.js";
import { registerSessionTools } from "./tools/session.js";
import { registerSnapshotTools } from "./tools/snapshot.js";
import { registerWaitTool } from "./tools/wait.js";

/** The built server and its session manager (for shutdown). */
export interface BuiltServer {
  server: McpServer;
  sessions: SessionManager;
}

/** Create the fuse-browser MCP server with every tool and resource wired. */
export function createServer(): BuiltServer {
  const server = new McpServer({ name: "fuse-browser", version: VERSION });
  const sessions = new SessionManager();
  registerProbeTools(server);
  registerSerpBatchTool(server);
  registerSessionTools(server, sessions);
  registerConnectTool(server, sessions);
  registerNavigateTool(server, sessions);
  registerActTools(server, sessions);
  registerSnapshotTools(server, sessions);
  registerWaitTool(server, sessions);
  registerRunTool(server, sessions);
  registerExtractTool(server, sessions);
  registerExtractSchemaTool(server, sessions);
  registerScreenshotTool(server, sessions);
  registerResources(server);
  return { server, sessions };
}
