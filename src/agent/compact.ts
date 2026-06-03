/**
 * Compact projection of a probe report for tool/CLI output.
 * @module agent/compact
 */
import type { ProbeReport } from "../interfaces/report.js";

/** Pick the operationally useful fields from a full report. */
export function compactReport(r: ProbeReport): Record<string, unknown> {
  return {
    title: r.title,
    url: r.url,
    realtime: r.realtime,
    domChanged: r.domChanged,
    text: r.text,
    prices: r.prices,
    hotelOffers: r.hotelOffers,
    challenges: r.challenges,
    captcha: r.captcha,
    serp: r.serp,
    contacts: r.contacts,
    visual: r.visual,
    actions: r.actions,
    replay: r.replay,
    siteMemory: r.siteMemory,
    currency: r.currency,
    identity: r.identity,
    consent: r.consent,
    screenshotPath: r.screenshotPath,
    reportPath: r.reportPath,
    storageStatePath: r.storageStatePath,
  };
}
