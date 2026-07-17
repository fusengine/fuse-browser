/**
 * Assembled `outputSchema` raw shape for `browser_probe` / `browser_probe_html`
 * — mirrors `compactReport()` (`agent/compact.ts`) field-for-field.
 * @module server/tools/probe-output-schema
 */
import { z } from "zod";
import { actionResultSchema } from "./schemas-action-output.js";
import { contactsSchema } from "./schemas-contacts-output.js";
import { challengesSchema, hotelOffersSchema } from "./schemas-hotel-challenges-output.js";
import { priceSchema } from "./schemas-price-output.js";
import { serpSchema } from "./schemas-serp-output.js";
import {
  captchaOutcomeSchema,
  consentSchema,
  currencyResultSchema,
  identitySchema,
  replaySchema,
  siteMemorySchema,
  visualSchema,
} from "./probe-output-parts.js";

/** Raw shape passed as `outputSchema` to both `browser_probe` tools. */
export const probeReportShape = {
  title: z.string(),
  url: z.string(),
  realtime: z.boolean(),
  domChanged: z.boolean(),
  text: z.string(),
  prices: z.array(priceSchema),
  hotelOffers: hotelOffersSchema,
  challenges: challengesSchema,
  captcha: captchaOutcomeSchema.optional(),
  serp: serpSchema.optional(),
  contacts: contactsSchema.optional(),
  fastPath: z.boolean().optional(),
  visual: visualSchema,
  actions: z.array(actionResultSchema),
  replay: replaySchema,
  siteMemory: siteMemorySchema,
  currency: currencyResultSchema,
  identity: identitySchema,
  consent: consentSchema,
  screenshotPath: z.string(),
  reportPath: z.string(),
  storageStatePath: z.string().nullable(),
};
