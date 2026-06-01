/**
 * Résolution de l'identité navigateur depuis les options.
 * @module identity/resolve
 */
import type { CountryProfile } from "../interfaces/types.js";
import { COUNTRY_PROFILES, LOCALE_COUNTRY_HINTS } from "./country-profiles.js";

/** Identité effective dérivée du pays + surcharges explicites. */
export interface ResolvedIdentity {
  countryCode: string;
  locale: string;
  timezoneId: string;
  currency: string;
  geolocation: CountryProfile["geolocation"];
  acceptLanguage: string;
}

const DEFAULT: CountryProfile = COUNTRY_PROFILES.CH as CountryProfile;

/**
 * Dérive locale/devise/fuseau/géoloc à partir du pays (ou de la locale),
 * en laissant les valeurs explicites surcharger le profil pays.
 */
export function resolveIdentity(opts: {
  countryCode?: string;
  locale?: string;
  timezoneId?: string;
  currency?: string;
}): ResolvedIdentity {
  const inferred = (
    opts.countryCode ||
    LOCALE_COUNTRY_HINTS[opts.locale ?? ""] ||
    "CH"
  ).toUpperCase();
  const profile = COUNTRY_PROFILES[inferred] ?? DEFAULT;
  return {
    countryCode: inferred,
    locale: opts.locale || profile.locale,
    timezoneId: opts.timezoneId || profile.timezoneId,
    currency: (opts.currency || profile.currency).toUpperCase(),
    geolocation: { ...profile.geolocation },
    acceptLanguage: profile.acceptLanguage,
  };
}
