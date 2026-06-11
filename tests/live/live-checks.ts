/**
 * Shared helpers for the live non-regression harness: MCP connection,
 * payload extraction, and the PASS/FAIL assertion counter.
 * @module tests/live/live-checks
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/** Absolute project root (cwd for the spawned MCP server). */
export const ROOT =
  "/Users/brunoazoulay/Labo/docker-lab/dev.local/Dev-ai/claude-code/fuse-browser";

/** Tools exposed before this changeset — must all survive. */
export const BASELINE = [
  "browser_probe", "browser_probe_html", "browser_fetch", "browser_fetch_batch",
  "browser_crawl", "browser_collect_batch", "browser_shots_batch", "browser_site_shots",
  "browser_serp_batch", "browser_open", "browser_status", "browser_close",
  "browser_connect", "browser_navigate", "browser_click", "browser_fill",
  "browser_scroll", "browser_press", "browser_select", "browser_back",
  "browser_forward", "browser_wait", "browser_login", "browser_snapshot",
  "browser_act", "browser_collect", "browser_wait_for", "browser_run",
  "browser_extract", "browser_extract_schema", "browser_screenshot",
  "browser_inspect", "browser_visual_diff", "browser_handoff",
  "browser_live_view", "browser_live_view_stop", "browser_metrics",
];

/** Tools introduced by this changeset. */
export const NEW_TOOLS = [
  "browser_tabs", "browser_dialog", "browser_downloads", "browser_console", "browser_network",
];

/** Loosely-typed decoded tool payload (server returns JSON of varying shape). */
export type Payload = Record<string, unknown>;

/** Merged network row returned by `browser_network`. */
export interface NetRow {
  url: string;
  status?: number;
  resourceType?: string;
}

/** Mutable assertion counter shared across the run. */
export const state = { failures: 0 };

/** Record a PASS/FAIL line and increment the failure counter on miss. */
export function check(label: string, ok: boolean, detail?: string): void {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) state.failures += 1;
}

/** Spawn the MCP server over stdio and return a connected client. */
export async function connect(env?: Record<string, string>): Promise<Client> {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["--import", "tsx", "src/bin/mcp.ts"],
    cwd: ROOT,
    env: { ...(process.env as Record<string, string>), ...env },
  });
  const client = new Client({ name: "live-check", version: "0.0.1" });
  await client.connect(transport);
  return client;
}

/** Extract structured content (or parse the text block) from a tool result. */
export function payload(res: unknown): Payload {
  const r = res as {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: Payload;
  };
  if (r.structuredContent) return r.structuredContent;
  const text = (r.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  try {
    return JSON.parse(text) as Payload;
  } catch {
    return { _raw: text };
  }
}
