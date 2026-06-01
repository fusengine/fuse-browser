/**
 * Visual observation: interactive elements with positions + viewport.
 * @module extraction/visual
 */
import type { Page } from "playwright";
import { VIEWPORT } from "../engine/context.js";
import type { InteractiveElement, Visual } from "../interfaces/extraction.js";
import { evalScript } from "../lib/evaluate.js";

const INTERACTIVE_SCRIPT = `() => [...document.querySelectorAll('button,a,input,select,textarea,[role=button]')]
  .slice(0, 80)
  .map((el, index) => {
    const rect = el.getBoundingClientRect();
    return {
      index,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim(),
      role: el.getAttribute('role'),
      id: el.id || null,
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      href: el.getAttribute('href'),
      visible: rect.width > 0 && rect.height > 0,
      box: {x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)}
    };
  })`;

/** Capture the list of visible interactive elements and their boxes. */
export async function visualObservation(page: Page, screenshotPath: string): Promise<Visual> {
  const interactiveElements = await evalScript<InteractiveElement[]>(page, INTERACTIVE_SCRIPT);
  return {
    screenshotPath,
    viewport: { ...VIEWPORT },
    interactiveElements,
  };
}
