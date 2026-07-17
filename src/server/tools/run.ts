/**
 * `browser_run`: execute a multi-step plan in one call (navigate/act/wait/extract),
 * stopping at the first failed step. Reduces LLM round-trips.
 * @module server/tools/run
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type RunStep, runSteps } from "../../agent/run-steps.js";
import { preflight } from "../../guardrails/preflight.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";
import { actionResultSchema } from "./schemas-action-output.js";
import { withSession } from "./with-session.js";

/** `browser_run` output shape: overall success flag, per-step results, final URL. */
export const RUN_OUTPUT_SHAPE = { ok: z.boolean(), steps: z.array(actionResultSchema), url: z.string() };

const stepSchema = z.object({ type: z.string() }).catchall(z.unknown());

/** Register `browser_run`. */
export function registerRunTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_run",
    {
      title: "Run multi-step plan",
      description:
        "Execute an ordered list of steps (navigate, click, fill, scroll, press, select, upload, wait_for, extract) in one call. `upload` sets local file path(s) on an `<input type=file>` via `files` (single path, comma-separated string, or array). Stops at the first failed step. Sensitive actions need humanApproved.",
      inputSchema: {
        sessionId: z.string(),
        steps: z.array(stepSchema),
        humanApproved: z.boolean().optional(),
      },
      outputSchema: RUN_OUTPUT_SHAPE,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      const steps = (a.steps as RunStep[]) ?? [];
      const pf = preflight(steps, Boolean(a.humanApproved));
      if (!pf.allowed) return errorResult(`Action blocked: ${pf.reason}: ${pf.blockedActions.join(", ")}`);
      return withSession(sessions, String(a.sessionId), async (s) => {
        const results = await runSteps(s.page, steps, s.config.humanMode);
        const ok = results.every((r) => r.ok) && results.length === steps.length;
        return jsonResult({ ok, steps: results, url: s.page.url() });
      });
    },
  );
}
