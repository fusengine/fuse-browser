/**
 * Wire per-site memory into a single action execution: inject the remembered
 * winning `preferredStrategy` before running, and persist the winner on success.
 * No-op for non click/fill actions (they have no memory key). Used by the MCP
 * act tools, which otherwise would never consult site memory.
 * @module state/action-memory
 */
import type { Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";
import { loadSiteMemory, rememberActionStrategy, rememberedAction } from "./site-memory.js";

/** A loose action with the fields site memory keys on. */
type Action = Record<string, unknown> & { type: string; target?: string };

/**
 * Run `exec(action)` with site-memory assist: prefill `preferredStrategy` from
 * memory, then persist the winning strategy if the action succeeds. When `dir`
 * is empty memory is skipped.
 */
export async function runWithMemory(
  dir: string,
  page: Page,
  action: Action,
  exec: (a: Action) => Promise<ActionResult>,
): Promise<ActionResult> {
  if (!dir) return exec(action);
  const url = page.url();
  const remembered = rememberedAction(loadSiteMemory(dir, url), action);
  if (remembered && !action.preferredStrategy) action.preferredStrategy = remembered.strategy;
  const result = await exec(action);
  if (result.ok) rememberActionStrategy(dir, url, action, result);
  return result;
}
