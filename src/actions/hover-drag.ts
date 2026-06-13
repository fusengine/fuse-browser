/**
 * Hover and drag-and-drop actions. Shared by `performAction` (run steps),
 * the snapshot `browser_act` ref/target path, and `actByRef`. `hover` moves the
 * pointer over an element; `drag` drops a source element onto a destination.
 * @module actions/hover-drag
 */
import type { Locator, Page } from "playwright";
import type { ActionResult } from "../interfaces/types.js";

/** Move the pointer over an already-resolved locator. */
export async function hoverLocator(locator: Locator): Promise<ActionResult> {
  try {
    await locator.hover({ timeout: 5_000 });
    return { type: "hover", ok: true };
  } catch (err) {
    return { type: "hover", ok: false, error: String(err).split("\n")[0] ?? "error" };
  }
}

/** Resolve `target` to its first match and hover it. */
export async function hover(page: Page, target: string): Promise<ActionResult> {
  if (!target) return { type: "hover", ok: false, error: "no_target" };
  return { ...(await hoverLocator(page.locator(target).first())), target };
}

/** Drag an already-resolved source locator onto a destination locator. */
export async function dragLocator(source: Locator, destination: Locator): Promise<ActionResult> {
  try {
    await source.dragTo(destination, { timeout: 10_000 });
    return { type: "drag", ok: true };
  } catch (err) {
    return { type: "drag", ok: false, error: String(err).split("\n")[0] ?? "error" };
  }
}

/**
 * Drag the `target` element onto the `to` destination.
 *
 * @param page - Active Playwright page.
 * @param target - Selector for the source element to grab.
 * @param to - Selector for the destination to drop onto.
 * @returns Action result tagged with `target` and `to`.
 */
export async function drag(page: Page, target: string, to: string): Promise<ActionResult> {
  if (!target) return { type: "drag", ok: false, error: "no_target" };
  if (!to) return { type: "drag", ok: false, error: "no_destination" };
  const r = await dragLocator(page.locator(target).first(), page.locator(to).first());
  return { ...r, target, to };
}
