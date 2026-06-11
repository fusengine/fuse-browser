/**
 * Build the MCP server with all tools and resources registered.
 * @module server/server
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VERSION } from "../lib/version.js";
import { SessionManager } from "../session/manager.js";
import { CAP_GROUPS, parseCaps } from "./caps.js";
import { toolGroups } from "./registry.js";
import { registerResources } from "./resources.js";

/** The built server and its session manager (for shutdown). */
export interface BuiltServer {
  server: McpServer;
  sessions: SessionManager;
}

/**
 * Create the fuse-browser MCP server. Tool groups can be filtered with the
 * `FUSE_CAPS` env var (e.g. `FUSE_CAPS=core,extract`) to expose fewer tools
 * to the client; resources are always registered.
 */
export function createServer(): BuiltServer {
  const server = new McpServer({ name: "fuse-browser", version: VERSION });
  const sessions = new SessionManager();
  const caps = parseCaps(process.env.FUSE_CAPS);
  const groups = toolGroups(server, sessions);
  for (const group of CAP_GROUPS) {
    if (caps.has(group)) for (const register of groups[group]) register();
  }
  registerResources(server, sessions);
  return { server, sessions };
}
