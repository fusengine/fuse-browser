#!/usr/bin/env node
/**
 * fuse-browser MCP server entry point (stdio transport).
 * @module bin/mcp
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "../lib/logger.js";
import { createServer } from "../server/server.js";

async function main(): Promise<void> {
  const { server, sessions } = createServer();
  let closing = false;
  const shutdown = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    await sessions.closeAll();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  await server.connect(new StdioServerTransport());
  logger.info("fuse-browser MCP server running on stdio");
}

main().catch((err) => {
  logger.error("fatal", { err: String(err) });
  process.exit(1);
});
