/**
 * Shared open→navigate→teardown harness for the one-shot page commands. Opens a
 * browser context from the CLI flags, navigates to `url`, hands a live page to
 * the caller, and always tears the context down in a `finally`.
 * @module bin/cli-page
 */
import type { Page } from "playwright";
import { resolveConfig } from "../agent/config.js";
import { selectEngineForConfig } from "../engine/registry.js";
import { teardownOpened } from "../engine/teardown.js";
import { DEFAULT_GOTO, gotoWithRetry } from "../net/navigate.js";
import { cliAgentOptions } from "./cli-config.js";

type Values = Record<string, unknown>;

/**
 * Open a page on `url`, run `fn`, then tear the context down.
 *
 * @param url - Target URL to navigate to before invoking `fn`.
 * @param values - Parsed CLI flags (mapped via {@link cliAgentOptions}).
 * @param fn - Receives the navigated page; its result is returned.
 * @returns Whatever `fn` resolves to.
 */
export async function withCliPage<T>(url: string, values: Values, fn: (page: Page) => Promise<T>): Promise<T> {
  const config = resolveConfig(cliAgentOptions(values));
  const opened = await selectEngineForConfig(config).open(config);
  const page = opened.page ?? (await opened.context.newPage());
  try {
    await gotoWithRetry(page, url, DEFAULT_GOTO, config.retry);
    const waitMs = values["wait-ms"] ? Number(values["wait-ms"]) : 0;
    if (waitMs > 0) await page.waitForTimeout(waitMs);
    return await fn(page);
  } finally {
    await teardownOpened(opened);
  }
}
