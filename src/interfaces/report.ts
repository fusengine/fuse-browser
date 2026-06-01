/**
 * Types des rapports produits par l'agent.
 * @module interfaces/report
 */
import type { Challenges, HotelOffers, Price, Visual } from "./extraction.js";
import type { ActionResult, Geolocation } from "./types.js";

/** Rapport d'identité du navigateur (pays, proxy masqué...). */
export interface Identity {
  countryCode: string;
  locale: string;
  timezoneId: string;
  currency: string;
  geolocation: Geolocation;
  acceptLanguage: string;
  realisticProfile: boolean;
  persistentProfile: boolean;
  userDataDir: string | null;
  proxyEnabled: boolean;
  proxyUrl: string | null;
  proxySource: string | null;
  proxyCountryCode: string | null;
  proxyRequiredForIpAlignment: boolean;
}

/** Une étape de replay (avant/après action). */
export interface ReplayStep {
  index: number;
  action: Record<string, unknown>;
  result: ActionResult;
  beforeDomSignature: string;
  afterDomSignature: string;
  domChanged: boolean;
  beforeScreenshotPath: string | null;
  afterScreenshotPath: string | null;
}

/** Résultat de gestion de consentement. */
export interface ConsentResult {
  handled: boolean;
  target?: string;
  strategy?: string;
}

/** Résultat d'alignement de devise. */
export interface CurrencyResult {
  countryCode: string;
  preferred: string;
  detected: string | null;
  handled: boolean;
  mismatch?: boolean;
  detectedAfter?: string | null;
  reason?: string;
}

/** Rapport complet d'un probe. */
export interface ProbeReport {
  url: string;
  title: string;
  realtime: boolean;
  domChanged: boolean;
  text: string;
  prices: Price[];
  hotelOffers: HotelOffers | Record<string, never>;
  challenges: Challenges | Record<string, never>;
  visual: Visual | Record<string, never>;
  consent: ConsentResult;
  currency: CurrencyResult;
  identity: Identity;
  actions: ActionResult[];
  replay: { enabled: boolean; steps: ReplayStep[]; dir: string | null };
  siteMemory: { enabled: boolean; updated: boolean; filePath: string };
  network: Array<Record<string, unknown>>;
  console: Array<{ type: string; text: string }>;
  screenshotPath: string;
  reportPath: string;
  storageStatePath: string | null;
}
