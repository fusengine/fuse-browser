/**
 * Execute the action plan, recording replay steps and site memory.
 * @module agent/actions-loop
 */
import type { Page } from "playwright";
import { type ActionInput, performAction, safeActionForReport } from "../actions/perform.js";
import type { ReplayStep } from "../interfaces/report.js";
import type { ActionResult } from "../interfaces/types.js";
import { domSignature } from "../state/dom-signature.js";
import { waitForRealtimeSettle } from "../state/realtime.js";
import { captureReplayScreenshot } from "../state/replay.js";
import { loadSiteMemory, rememberActionStrategy, rememberedAction } from "../state/site-memory.js";
import type { ResolvedConfig } from "./config.js";

/** Outcome of running the action plan. */
export interface ActionsOutcome {
  results: ActionResult[];
  replaySteps: ReplayStep[];
  siteMemoryUpdated: boolean;
}

/** Run each action sequentially, applying remembered strategies and capturing replay. */
export async function runActions(
  page: Page,
  config: ResolvedConfig,
  actions: ActionInput[],
  targetUrl: string,
  runId: string,
): Promise<ActionsOutcome> {
  const results: ActionResult[] = [];
  const replaySteps: ReplayStep[] = [];
  let siteMemoryUpdated = false;
  const memory = loadSiteMemory(config.siteMemoryDir, targetUrl);

  for (let index = 0; index < actions.length; index += 1) {
    const source = actions[index];
    if (!source) continue;
    const action: ActionInput = { ...source };
    const remembered = rememberedAction(memory, action);
    if (remembered) action.preferredStrategy = remembered.strategy;
    const beforeDom = await domSignature(page);
    const beforeShot = await captureReplayScreenshot(page, config.replayDir, config.replayEnabled, runId, index, "before");
    const result = await performAction(page, action, config.humanMode);
    results.push(result);
    await waitForRealtimeSettle(page);
    const afterDom = await domSignature(page);
    const afterShot = await captureReplayScreenshot(page, config.replayDir, config.replayEnabled, runId, index, "after");
    replaySteps.push({
      index,
      action: safeActionForReport(action),
      result,
      beforeDomSignature: beforeDom,
      afterDomSignature: afterDom,
      domChanged: beforeDom !== afterDom,
      beforeScreenshotPath: beforeShot,
      afterScreenshotPath: afterShot,
    });
    if (result.ok) {
      siteMemoryUpdated =
        rememberActionStrategy(config.siteMemoryDir, targetUrl, action, result) || siteMemoryUpdated;
    }
  }
  return { results, replaySteps, siteMemoryUpdated };
}
