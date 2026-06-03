/**
 * Assemble and persist the probe report.
 * @module agent/report
 */
import { extractHotelOffers } from "../extraction/hotel-offers.js";
import { extractPrices } from "../extraction/prices.js";
import { buildIdentity } from "../identity/identity.js";
import type { Challenges, Serp, Visual } from "../interfaces/extraction.js";
import type { Contacts } from "../interfaces/contacts.js";
import type { CaptchaOutcome } from "../interfaces/net.js";
import type { ConsentResult, CurrencyResult, ProbeReport } from "../interfaces/report.js";
import { writeJson } from "../lib/fs.js";
import { siteMemoryFilePath } from "../state/site-memory.js";
import type { ActionsOutcome } from "./actions-loop.js";
import type { ResolvedConfig } from "./config.js";
import type { NetworkLog } from "./network.js";

/** All inputs needed to assemble a {@link ProbeReport}. */
export interface ReportInput {
  config: ResolvedConfig;
  targetUrl: string;
  title: string;
  text: string;
  before: string;
  after: string;
  hasActions: boolean;
  consent: ConsentResult;
  currency: CurrencyResult;
  challenges: Challenges | Record<string, never>;
  visual: Visual | Record<string, never>;
  outcome: ActionsOutcome;
  logs: NetworkLog;
  screenshotPath: string;
  reportPath: string;
  extractPricesFlag: boolean;
  captcha?: CaptchaOutcome;
  serp?: Serp;
  contacts?: Contacts;
}

/** Build the full report, write it to disk, and return it. */
export function buildReport(input: ReportInput): ProbeReport {
  const { config, outcome, logs } = input;
  const report: ProbeReport = {
    url: input.targetUrl,
    title: input.title,
    realtime: input.hasActions && input.before !== input.after,
    domChanged: input.before !== input.after,
    text: input.text,
    prices: input.extractPricesFlag ? extractPrices(input.text) : [],
    hotelOffers: input.extractPricesFlag ? extractHotelOffers(input.text) : {},
    challenges: input.challenges,
    visual: input.visual,
    consent: input.consent,
    currency: input.currency,
    identity: buildIdentity({
      identity: config.identity,
      realisticProfile: config.realisticProfile,
      userDataDir: config.userDataDir,
      proxyUrl: config.proxyUrl,
      proxySource: config.proxySource,
    }),
    actions: outcome.results,
    replay: {
      enabled: config.replayEnabled,
      steps: outcome.replaySteps,
      dir: config.replayEnabled ? config.replayDir : null,
    },
    siteMemory: {
      enabled: true,
      updated: outcome.siteMemoryUpdated,
      filePath: siteMemoryFilePath(config.siteMemoryDir, input.targetUrl),
    },
    network: logs.network.slice(-80),
    console: logs.console.slice(-80),
    screenshotPath: input.screenshotPath,
    reportPath: input.reportPath,
    storageStatePath: config.storageStatePath,
    captcha: input.captcha,
    serp: input.serp,
    contacts: input.contacts,
  };
  writeJson(input.reportPath, report);
  return report;
}
