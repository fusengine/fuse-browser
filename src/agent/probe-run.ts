/**
 * Orchestrate a single probe run: launch, navigate, act, capture, report.
 * @module agent/probe-run
 */
import { dirname, join } from "node:path";
import { type ActionInput } from "../actions/perform.js";
import { prepareBookingCurrency } from "../consent/booking-currency.js";
import { handleCommonConsent } from "../consent/consent.js";
import { applyCurrencyPreference } from "../consent/currency.js";
import { urlWithCurrency } from "../consent/currency-url.js";
import { selectEngineForConfig } from "../engine/registry.js";
import { teardownOpened } from "../engine/teardown.js";
import { mainText } from "../extraction/main-text.js";
import { visualObservation } from "../extraction/visual.js";
import type { ProbeReport } from "../interfaces/report.js";
import type { ProbeOptions } from "../interfaces/types.js";
import { ensureDir, sha1 } from "../lib/fs.js";
import { gotoWithRetry } from "../net/navigate.js";
import { throttleHost } from "../net/throttle.js";
import { reportProxyBlocked } from "../proxy/pool.js";
import { domSignature } from "../state/dom-signature.js";
import { runActions } from "./actions-loop.js";
import type { ResolvedConfig } from "./config.js";
import { detectAndSolve } from "./detect.js";
import { attachListeners } from "./network.js";
import { extractSerpStep } from "./serp-step.js";
import { buildReport } from "./report.js";

/** Run one probe against `url` and return the assembled report. */
export async function runProbe(
  config: ResolvedConfig,
  url: string,
  options: ProbeOptions = {},
): Promise<ProbeReport> {
  const actions = (options.actions ?? []) as ActionInput[];
  const runId = sha1(`${url}-${Date.now()}`).slice(0, 10);
  const screenshotPath = join(config.outputDir, `${runId}.png`);
  const reportPath = join(config.outputDir, `${runId}.json`);
  const opened = await selectEngineForConfig(config).open(config);
  const { context } = opened;
  try {
    const page = opened.page ?? (await context.newPage());
    const logs = attachListeners(page);
    const targetUrl = urlWithCurrency(url, config.currency);
    if (targetUrl.includes("booking.com") && config.currency) {
      await prepareBookingCurrency(page, config.currency);
    }
    await throttleHost(targetUrl, config.retry.throttleMs);
    await gotoWithRetry(page, targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 }, config.retry);
    try {
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
    } catch {
      /* networkidle is best-effort */
    }
    const consent = options.autoConsent
      ? await handleCommonConsent(page, config.humanMode)
      : { handled: false };
    const currency = await applyCurrencyPreference(page, config.currency, config.identity.countryCode);
    if (options.waitMs) await page.waitForTimeout(options.waitMs);
    const before = await domSignature(page);
    const outcome = await runActions(page, config, actions, targetUrl, runId);
    if (options.waitMs) await page.waitForTimeout(options.waitMs);
    const after = await domSignature(page);
    const text = await mainText(page);
    const { challenges, captcha } = await detectAndSolve(page, text, options, config);
    if (config.proxySource === "pool" && config.proxyUrl && "cloudflare" in challenges && (challenges.cloudflare || challenges.captcha)) reportProxyBlocked(config.proxyUrl);
    const title = await page.title();
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const visual = options.observeVisual ? await visualObservation(page, screenshotPath) : {};
    const serp = await extractSerpStep(page, options, config);
    if (config.storageStatePath) {
      ensureDir(dirname(config.storageStatePath));
      await context.storageState({ path: config.storageStatePath });
    }
    return buildReport({
      config,
      targetUrl,
      title,
      text,
      before,
      after,
      hasActions: actions.length > 0,
      consent,
      currency,
      challenges,
      visual,
      outcome,
      logs,
      screenshotPath,
      reportPath,
      extractPricesFlag: Boolean(options.extractPrices),
      captcha,
      serp,
    });
  } finally {
    await teardownOpened(opened);
  }
}
