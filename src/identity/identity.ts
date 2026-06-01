/**
 * Construction du rapport d'identité + masquage des credentials proxy.
 * @module identity/identity
 */
import type { Identity } from "../interfaces/report.js";
import type { ResolvedIdentity } from "./resolve.js";

/** Masque user:password dans une URL de proxy pour les rapports. */
export function redactProxyUrl(proxyUrl: string | null | undefined): string | null {
  if (!proxyUrl || !proxyUrl.includes("@")) return proxyUrl ?? null;
  const [scheme, rest] = proxyUrl.includes("://")
    ? (proxyUrl.split("://", 2) as [string, string])
    : ["", proxyUrl];
  const host = rest.split("@").pop() ?? rest;
  return scheme ? `${scheme}://***:***@${host}` : `***:***@${host}`;
}

/** Entrée pour construire le rapport d'identité. */
export interface IdentityInput {
  identity: ResolvedIdentity;
  realisticProfile: boolean;
  userDataDir: string | null;
  proxyUrl: string | null;
  proxySource: string | null;
}

/** Assemble le rapport d'identité exposé dans les probes. */
export function buildIdentity(input: IdentityInput): Identity {
  const { identity, proxyUrl, proxySource } = input;
  return {
    countryCode: identity.countryCode,
    locale: identity.locale,
    timezoneId: identity.timezoneId,
    currency: identity.currency,
    geolocation: identity.geolocation,
    acceptLanguage: identity.acceptLanguage,
    realisticProfile: input.realisticProfile,
    persistentProfile: Boolean(input.userDataDir),
    userDataDir: input.userDataDir,
    proxyEnabled: Boolean(proxyUrl),
    proxyUrl: redactProxyUrl(proxyUrl),
    proxySource,
    proxyCountryCode: proxySource === "country_map" ? identity.countryCode : null,
    proxyRequiredForIpAlignment: proxyUrl === null,
  };
}
