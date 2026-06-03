/**
 * Core domain types for the agentic browser.
 * @module interfaces/types
 */

/** Geographic coordinates for location emulation. */
export interface Geolocation {
  latitude: number;
  longitude: number;
}

/** Per-country identity profile (locale, currency, timezone, geo, language). */
export interface CountryProfile {
  locale: string;
  currency: string;
  timezoneId: string;
  geolocation: Geolocation;
  acceptLanguage: string;
}

/** Action that can be executed on the page. Discriminated union on `type`. */
export type BrowserAction =
  | { type: "click"; target: string; preferredStrategy?: string }
  | { type: "fill"; target: string; value: string; preferredStrategy?: string }
  | {
      type: "login";
      usernameTarget?: string;
      passwordTarget?: string;
      submitTarget?: string;
      username?: string;
      password?: string;
    }
  | { type: "wait"; ms?: number };

/** Normalized result of an action. */
export interface ActionResult {
  type: string;
  ok: boolean;
  target?: string;
  strategy?: string;
  error?: string;
  ms?: number;
  [extra: string]: unknown;
}

export type { AgentOptions, ProbeOptions } from "./options.js";
