/**
 * Zod raw-shape schemas for MCP tool inputs.
 * @module server/schemas
 */
import { z } from "zod";

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
  realisticProfile: z.boolean().optional(),
  replayEnabled: z.boolean().optional(),
  replayDir: z.string().optional(),
  siteMemoryDir: z.string().optional(),
  outputDir: z.string().optional(),
  retry: z
    .object({
      maxAttempts: z.number().int().optional(),
      baseMs: z.number().int().optional(),
      capMs: z.number().int().optional(),
      throttleMs: z.number().int().optional(),
    })
    .optional(),
  captcha: z
    .object({
      provider: z.enum(["2captcha", "anticaptcha", "capmonster"]),
      apiKey: z.string(),
      baseUrl: z.string().optional(),
      timeoutMs: z.number().int().optional(),
      pollMs: z.number().int().optional(),
    })
    .optional(),
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
};

/** `browser_probe` input shape. */
export const probeShape = { url: z.string(), ...agentOptionShape, ...probeFlags };

/** `browser_probe_html` input shape. */
export const probeHtmlShape = { html: z.string(), ...agentOptionShape, ...probeFlags };
