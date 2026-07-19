/**
 * Ordered target-resolution strategies shared by smart-click and the
 * `pick`/combobox paths: selector→role→text→label→placeholder. `getByText`/
 * `getByLabel`/`getByPlaceholder` are the safe escape valve for human-readable
 * targets whose text breaks the CSS selector parser (e.g. a bare `?` throws
 * `Unexpected token "?"...`) — `placeholder` last, for inputs identified only
 * by their placeholder attribute (no visible text, no `<label>`), e.g. a
 * destination field like `placeholder="Où allez-vous ?"`.
 * @module actions/resolve-click-target
 */
import type { Locator, Page } from "playwright";
import { escapeRegExp } from "../lib/text.js";

/** A named locator-producing strategy. */
export type TargetStrategy = [name: string, factory: () => Locator];

/** Build the ordered click-target strategies, `preferredStrategy` first. */
export function clickTargetStrategies(page: Page, target: string, preferredStrategy = ""): TargetStrategy[] {
  const rx = new RegExp(escapeRegExp(target), "i");
  const strategies: TargetStrategy[] = [
    ["selector", () => page.locator(target).first()],
    ["role", () => page.getByRole("button", { name: rx }).first()],
    ["text", () => page.getByText(rx).first()],
    ["label", () => page.getByLabel(rx).first()],
    ["placeholder", () => page.getByPlaceholder(rx).first()],
  ];
  if (preferredStrategy) {
    strategies.sort((a, b) => (a[0] === preferredStrategy ? 0 : 1) - (b[0] === preferredStrategy ? 0 : 1));
  }
  return strategies;
}

/**
 * Resolve `target` to the first strategy whose locator matches ≥1 element.
 * A malformed-CSS `target` (e.g. containing `?`) makes the `selector`
 * strategy's `.count()` throw — caught here so the next strategy is tried.
 */
export async function resolveClickTarget(
  page: Page,
  target: string,
  preferredStrategy = "",
): Promise<{ locator: Locator; strategy: string } | null> {
  for (const [strategy, factory] of clickTargetStrategies(page, target, preferredStrategy)) {
    try {
      const locator = factory();
      if ((await locator.count()) > 0) return { locator, strategy };
    } catch {
      // Fall through to the next strategy.
    }
  }
  return null;
}
