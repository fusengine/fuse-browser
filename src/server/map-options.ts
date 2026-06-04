/**
 * Map raw tool arguments to typed agent/probe options.
 * @module server/map-options
 */
import type { BrowserChannel } from "../interfaces/engine-types.js";
import type { AgentOptions, BrowserAction, ProbeOptions } from "../interfaces/types.js";
import { envAgentDefaults } from "./env-defaults.js";

/** Server-wide browser defaults from `FUSE_*` env (per-call args override these). */
const ENV = envAgentDefaults();

/** Extract {@link AgentOptions} from raw tool arguments, falling back to env. */
export function toAgentOptions(a: Record<string, unknown>): AgentOptions {
  return {
    engine: (a.engine as AgentOptions["engine"]) ?? ENV.engine,
    channel: (a.channel as BrowserChannel | undefined) ?? ENV.channel,
    executablePath: (a.executablePath as string | undefined) ?? ENV.executablePath,
    cdpEndpoint: (a.cdpEndpoint as string | undefined) ?? ENV.cdpEndpoint,
    cdpHeaders: a.cdpHeaders as Record<string, string> | undefined,
    cdpCloseOnDone: a.cdpCloseOnDone as boolean | undefined,
    cdpTimeoutMs: a.cdpTimeoutMs as number | undefined,
    headless: (a.headless as boolean | undefined) ?? ENV.headless,
    humanMode: a.humanMode as boolean | undefined,
    locale: a.locale as string | undefined,
    timezoneId: a.timezoneId as string | undefined,
    countryCode: (a.countryCode as string | undefined) ?? ENV.countryCode,
    currency: (a.currency as string | undefined) ?? ENV.currency,
    userDataDir: (a.userDataDir as string | undefined) ?? ENV.userDataDir,
    proxyUrl: a.proxyUrl as string | undefined,
    proxyMapPath: a.proxyMapPath as string | undefined,
    proxiesPath: a.proxiesPath as string | undefined,
    storageStatePath: (a.storageStatePath as string | undefined) ?? ENV.storageStatePath,
    harPath: a.harPath as string | undefined,
    harMode: a.harMode as "minimal" | "full" | undefined,
    harReplay: a.harReplay as string | undefined,
    realisticProfile: a.realisticProfile as boolean | undefined,
    respectRobots: a.respectRobots as boolean | undefined,
    replayEnabled: a.replayEnabled as boolean | undefined,
    replayDir: a.replayDir as string | undefined,
    siteMemoryDir: a.siteMemoryDir as string | undefined,
    outputDir: (a.outputDir as string | undefined) ?? ENV.outputDir,
    retry: a.retry as AgentOptions["retry"],
    circuitBreaker: a.circuitBreaker as AgentOptions["circuitBreaker"],
    probeQueue: a.probeQueue as AgentOptions["probeQueue"],
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
    extractSerp: a.extractSerp as boolean | undefined,
    serpPages: a.serpPages as number | undefined,
    rankDomain: a.rankDomain as string | undefined,
    extractContacts: a.extractContacts as boolean | undefined,
    contactCrawl: a.contactCrawl as ProbeOptions["contactCrawl"],
    contactFilter: a.contactFilter as ProbeOptions["contactFilter"],
  };
}
