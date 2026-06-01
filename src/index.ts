/**
 * Public API of the fuse-browser package.
 * @module index
 */
export { BrowserAgent } from "./agent/browser-agent.js";
export { compactReport } from "./agent/compact.js";
export { resolveConfig, type ResolvedConfig } from "./agent/config.js";
export { createServer, type BuiltServer } from "./server/server.js";
export { SessionManager } from "./session/manager.js";
export type { ProbeReport } from "./interfaces/report.js";
export type { AgentOptions, BrowserAction, ProbeOptions } from "./interfaces/types.js";
