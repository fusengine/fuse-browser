/**
 * Best-effort handling of common consent banners.
 * @module consent/consent
 */
import type { Page } from "playwright";
import { smartClick } from "../actions/smart-click.js";
import type { ConsentResult } from "../interfaces/report.js";
import { waitForRealtimeSettle } from "../state/realtime.js";

/** Frequent consent button labels (reject first). */
export const COMMON_CONSENT_TARGETS = [
  "Reject all",
  "Refuser tout",
  "Tout refuser",
  "Decline all",
  "Accept all",
  "Accepter tout",
  "Tout accepter",
  "J'accepte",
  "I agree",
  "Agree",
] as const;

/** Try to click a known consent button; return the result. */
export async function handleCommonConsent(page: Page, humanMode = false): Promise<ConsentResult> {
  for (const target of COMMON_CONSENT_TARGETS) {
    const result = await smartClick(page, target, "", humanMode);
    if (result.ok) {
      await waitForRealtimeSettle(page);
      return { handled: true, target, strategy: result.strategy };
    }
  }
  return { handled: false };
}
