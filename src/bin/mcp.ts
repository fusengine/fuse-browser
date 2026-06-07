#!/usr/bin/env node
/**
 * fuse-browser MCP server entry point (stdio transport).
 * @module bin/mcp
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "../lib/logger.js";
import { VERSION } from "../lib/version.js";
import { createServer } from "../server/server.js";

const USAGE = "usage: browser-mcp [--help] [--version]\n";
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(USAGE);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}

const unknownFlag = args.find((arg) => arg.startsWith("-"));
if (unknownFlag) {
  process.stderr.write(`error: Unknown option '${unknownFlag}'\n`);
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
