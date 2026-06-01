/**
 * Map raw tool arguments to typed agent/probe options.
 * @module server/map-options
 */
import type { BrowserChannel } from "../interfaces/engine-types.js";
import type { AgentOptions, BrowserAction, ProbeOptions } from "../interfaces/types.js";

/** Extract {@link AgentOptions} from raw tool arguments. */
export function toAgentOptions(a: Record<string, unknown>): AgentOptions {
  return {
    engine: a.engine as AgentOptions["engine"],
    channel: a.channel as BrowserChannel | undefined,
    executablePath: a.executablePath as string | undefined,
    cdpEndpoint: a.cdpEndpoint as string | undefined,
    headless: a.headless as boolean | undefined,
    humanMode: a.humanMode as boolean | undefined,
    locale: a.locale as string | undefined,
    timezoneId: a.timezoneId as string | undefined,
    countryCode: a.countryCode as string | undefined,
    currency: a.currency as string | undefined,
    userDataDir: a.userDataDir as string | undefined,
    proxyUrl: a.proxyUrl as string | undefined,
    proxyMapPath: a.proxyMapPath as string | undefined,
    storageStatePath: a.storageStatePath as string | undefined,
    realisticProfile: a.realisticProfile as boolean | undefined,
    replayEnabled: a.replayEnabled as boolean | undefined,
    replayDir: a.replayDir as string | undefined,
    siteMemoryDir: a.siteMemoryDir as string | undefined,
    outputDir: a.outputDir as string | undefined,
    retry: a.retry as AgentOptions["retry"],
    captcha: a.captcha as AgentOptions["captcha"],
  };
}

/** Extract {@link ProbeOptions} from raw tool arguments. */
export function toProbeOptions(a: Record<string, unknown>): ProbeOptions {
  return {
    actions: a.actions as BrowserAction[] | undefined,
    humanApproved: a.humanApproved as boolean | undefined,
    autoConsent: a.autoConsent as boolean | undefined,
    extractPrices: a.extractPrices as boolean | undefined,
    waitMs: a.waitMs as number | undefined,
    detectChallenges: a.detectChallenges as boolean | undefined,
    observeVisual: a.observeVisual as boolean | undefined,
    solveCaptcha: a.solveCaptcha as boolean | undefined,
  };
}
