/**
 * Zod raw-shape schemas for MCP tool inputs.
 * @module server/schemas
 */
import { z } from "zod";
import { captchaSchema, circuitBreakerSchema, retrySchema } from "./schemas-resilience.js";

/** Installed-browser channels (real Chrome/Edge). */
const CHANNELS = [
  "chrome",
  "chrome-beta",
  "chrome-dev",
  "chrome-canary",
  "msedge",
  "msedge-beta",
  "msedge-dev",
  "msedge-canary",
] as const;

/** Shared browser identity / profile options. */
export const agentOptionShape = {
  engine: z.enum(["playwright", "patchright", "firefox", "webkit"]).optional(),
  channel: z.enum(CHANNELS).optional(),
  executablePath: z.string().optional(),
  cdpEndpoint: z.string().optional(),
  cdpHeaders: z.record(z.string(), z.string()).optional(),
  cdpCloseOnDone: z.boolean().optional(),
  cdpTimeoutMs: z.number().int().optional(),
  headless: z.boolean().optional(),
  humanMode: z.boolean().optional(),
  locale: z.string().optional(),
  timezoneId: z.string().optional(),
  countryCode: z.string().optional(),
  currency: z.string().optional(),
  userDataDir: z.string().optional(),
  proxyUrl: z.string().optional(),
  proxyMapPath: z.string().optional(),
  proxiesPath: z.string().optional(),
  storageStatePath: z.string().optional(),
  harPath: z.string().optional(),
  harMode: z.enum(["minimal", "full"]).optional(),
  harReplay: z.string().optional(),
  realisticProfile: z.boolean().optional(),
  respectRobots: z.boolean().optional().describe("Honor robots.txt (opt-in; off by default)."),
  replayEnabled: z.boolean().optional(),
  replayDir: z.string().optional(),
  siteMemoryDir: z.string().optional(),
  outputDir: z.string().optional(),
  retry: retrySchema,
  captcha: captchaSchema,
  circuitBreaker: circuitBreakerSchema,
};

/** A single action (loose: type + arbitrary fields). */
export const actionSchema = z.object({ type: z.string() }).catchall(z.unknown());

const probeFlags = {
  autoConsent: z.boolean().optional(),
  extractPrices: z.boolean().optional(),
  detectChallenges: z.boolean().optional(),
  observeVisual: z.boolean().optional(),
  waitMs: z.number().int().optional(),
  humanApproved: z.boolean().optional(),
  actions: z.array(actionSchema).optional(),
  solveCaptcha: z.boolean().optional(),
  extractSerp: z.boolean().optional(),
  serpPages: z.number().int().optional(),
  rankDomain: z.string().optional(),
  extractContacts: z.boolean().optional().describe("Extract emails/phones (personal data — lawful basis required: GDPR/nLPD)."),
  contactCrawl: z
    .object({ enabled: z.boolean(), maxPages: z.number().int().optional() })
    .optional()
    .describe("Follow same-domain contact/impressum links when no email is found (bounded)."),
  contactFilter: z
    .enum(["strict", "off"])
    .optional()
    .describe('Filter placeholder emails: "strict" (default) drops template addresses, "off" keeps all.'),
};

/** `browser_probe` input shape. */
export const probeShape = { url: z.string(), ...agentOptionShape, ...probeFlags };

/** `browser_probe_html` input shape. */
export const probeHtmlShape = { html: z.string(), ...agentOptionShape, ...probeFlags };
