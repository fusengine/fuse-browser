/**
 * `browser_cookies` output schema — split out of `cookies.ts` to keep it under
 * the 100-line SOLID limit.
 * @module server/tools/cookies-output
 */
import { z } from "zod";

/**
 * A returned Playwright cookie (`context.cookies()`). Only `name`/`value` are
 * kept required — the rest are optional so the schema never rejects a lighter
 * test double or a future Playwright field addition (extra keys are stripped).
 */
const COOKIE_ITEM_SHAPE = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(["Strict", "Lax", "None"]).optional(),
  partitionKey: z.string().optional(),
});

/** Merged success shape across the 3 `browser_cookies` actions (get/set/clear). */
export const COOKIES_OUTPUT_SHAPE = {
  cookies: z.array(COOKIE_ITEM_SHAPE).optional(),
  added: z.number().optional(),
  cleared: z.literal(true).optional(),
};
