/**
 * Dispatch actions to their specialized implementations.
 * @module actions/perform
 */
import type { Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";
import { pickAutocomplete } from "./autocomplete.js";
import { isComboboxTrigger, openComboboxAndPick } from "./combobox.js";
import { drag, hover } from "./hover-drag.js";
import { login, type LoginAction } from "./login.js";
import { navigateHistory, pressKey, scroll, selectOption, typeText } from "./navigation.js";
import { resolveClickTarget } from "./resolve-click-target.js";
import { smartClick } from "./smart-click.js";
import { smartFill } from "./smart-fill.js";
import { type FilesInput, uploadFiles } from "./upload.js";

/** Loose runtime action (may carry `preferredStrategy` injected by site memory). */
export type ActionInput = Record<string, unknown> & { type: string };

/** Execute an action based on its `type`. */
export async function performAction(
  page: Page,
  action: ActionInput,
  humanMode = false,
): Promise<ActionResult> {
  const target = String(action.target ?? "");
  const preferred = String(action.preferredStrategy ?? "");
  switch (action.type) {
    case "click":
      return smartClick(page, target, preferred, humanMode);
    case "fill":
      return smartFill(page, target, String(action.value ?? ""), preferred, humanMode);
    case "login":
      return login(page, action as LoginAction, humanMode);
    case "scroll":
      return scroll(page, Number(action.deltaY ?? 600), Number(action.deltaX ?? 0), {
        selector: typeof action.selector === "string" ? action.selector : undefined,
        to: action.to === "end" ? "end" : undefined,
      });
    case "press":
      return pressKey(page, String(action.key ?? ""));
    case "type":
      return typeText(page, String(action.text ?? action.value ?? ""));
    case "select":
      return selectOption(page, target, String(action.value ?? ""));
    case "upload":
      return uploadFiles(page, target, (action.files ?? action.value ?? "") as FilesInput);
    case "hover":
      return hover(page, target);
    case "drag":
      return drag(page, target, String(action.to ?? ""));
    case "pick": {
      const value = String(action.value ?? "");
      const option = String(action.option ?? "");
      const resolved = (await resolveClickTarget(page, target)) ?? { locator: page.locator(target).first(), strategy: "selector" };
      if (await isComboboxTrigger(resolved.locator)) return openComboboxAndPick(page, resolved.locator, value, option || value);
      return pickAutocomplete(page, resolved.locator, value, option);
    }
    case "back":
    case "forward":
      return navigateHistory(page, action.type);
    case "wait": {
      const ms = Number(action.ms ?? 500);
      await page.waitForTimeout(ms);
      return { type: "wait", ok: true, ms };
    }
    default:
      return { type: action.type, ok: false, error: "unknown_action" };
  }
}

/** Copy of an action for the report, password masked. */
export function safeActionForReport(action: ActionInput): Record<string, unknown> {
  const safe = { ...action };
  if ("password" in safe) safe.password = "***";
  return safe;
}
