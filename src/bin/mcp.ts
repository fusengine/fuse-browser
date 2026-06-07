#!/usr/bin/env node
/**
 * fuse-browser MCP server entry point (stdio transport).
 * @module bin/mcp
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "../lib/logger.js";
import { createServer } from "../server/server.js";
import { firstFlag, handleMetaFlags } from "./cli-meta.js";

// Resolve metadata flags before the stdio transport binds — any stdout write
// after `server.connect` would corrupt the MCP protocol stream.
const argv = process.argv.slice(2);
handleMetaFlags(argv, "usage: browser-mcp [--help] [--version]\n");
const badFlag = firstFlag(argv);
if (badFlag) {
  process.stderr.write(`error: Unknown option '${badFlag}'\n`);
  process.exit(1);
}

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
