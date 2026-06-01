/**
 * Profils d'identité par pays : locale, devise, fuseau, géoloc, Accept-Language.
 * @module identity/country-profiles
 */
import type { CountryProfile } from "../interfaces/types.js";

/** User-agent desktop réaliste (Chrome stable). */
export const REALISTIC_DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/125.0.0.0 Safari/537.36";

/** [code, locale, currency, timezoneId, lat, lon, acceptLanguage?] */
type Row = [string, string, string, string, number, number, string?];

const ROWS: Row[] = [
  ["CH", "fr-CH", "CHF", "Europe/Zurich", 46.5197, 6.6323],
  ["US", "en-US", "USD", "America/New_York", 40.7128, -74.006, "en-US,en;q=0.9"],
  ["GB", "en-GB", "GBP", "Europe/London", 51.5074, -0.1278, "en-GB,en;q=0.9"],
  ["UK", "en-GB", "GBP", "Europe/London", 51.5074, -0.1278, "en-GB,en;q=0.9"],
  ["FR", "fr-FR", "EUR", "Europe/Paris", 48.8566, 2.3522],
  ["DE", "de-DE", "EUR", "Europe/Berlin", 52.52, 13.405],
  ["IT", "it-IT", "EUR", "Europe/Rome", 41.9028, 12.4964],
  ["ES", "es-ES", "EUR", "Europe/Madrid", 40.4168, -3.7038],
  ["PT", "pt-PT", "EUR", "Europe/Lisbon", 38.7223, -9.1393],
  ["NL", "nl-NL", "EUR", "Europe/Amsterdam", 52.3676, 4.9041],
  ["BE", "fr-BE", "EUR", "Europe/Brussels", 50.8503, 4.3517],
  ["AT", "de-AT", "EUR", "Europe/Vienna", 48.2082, 16.3738],
  ["IE", "en-IE", "EUR", "Europe/Dublin", 53.3498, -6.2603],
  ["LU", "fr-LU", "EUR", "Europe/Luxembourg", 49.6116, 6.1319],
  ["NO", "nb-NO", "NOK", "Europe/Oslo", 59.9139, 10.7522],
  ["SE", "sv-SE", "SEK", "Europe/Stockholm", 59.3293, 18.0686],
  ["DK", "da-DK", "DKK", "Europe/Copenhagen", 55.6761, 12.5683],
  ["PL", "pl-PL", "PLN", "Europe/Warsaw", 52.2297, 21.0122],
  ["CZ", "cs-CZ", "CZK", "Europe/Prague", 50.0755, 14.4378],
  ["CA", "en-CA", "CAD", "America/Toronto", 43.6532, -79.3832, "en-CA,en;q=0.9,fr;q=0.8"],
  ["MX", "es-MX", "MXN", "America/Mexico_City", 19.4326, -99.1332],
  ["BR", "pt-BR", "BRL", "America/Sao_Paulo", -23.5505, -46.6333],
  ["AR", "es-AR", "ARS", "America/Argentina/Buenos_Aires", -34.6037, -58.3816],
  ["CL", "es-CL", "CLP", "America/Santiago", -33.4489, -70.6693],
  ["CO", "es-CO", "COP", "America/Bogota", 4.711, -74.0721],
  ["AU", "en-AU", "AUD", "Australia/Sydney", -33.8688, 151.2093, "en-AU,en;q=0.9"],
  ["NZ", "en-NZ", "NZD", "Pacific/Auckland", -36.8509, 174.7645, "en-NZ,en;q=0.9"],
  ["JP", "ja-JP", "JPY", "Asia/Tokyo", 35.6762, 139.6503],
  ["KR", "ko-KR", "KRW", "Asia/Seoul", 37.5665, 126.978],
  ["CN", "zh-CN", "CNY", "Asia/Shanghai", 31.2304, 121.4737],
  ["HK", "zh-HK", "HKD", "Asia/Hong_Kong", 22.3193, 114.1694, "zh-HK,zh;q=0.9,en;q=0.8"],
  ["SG", "en-SG", "SGD", "Asia/Singapore", 1.3521, 103.8198, "en-SG,en;q=0.9,zh;q=0.8"],
  ["IN", "en-IN", "INR", "Asia/Kolkata", 28.6139, 77.209, "en-IN,en;q=0.9,hi;q=0.8"],
  ["AE", "en-AE", "AED", "Asia/Dubai", 25.2048, 55.2708, "en-AE,en;q=0.9,ar;q=0.8"],
  ["SA", "ar-SA", "SAR", "Asia/Riyadh", 24.7136, 46.6753],
  ["IL", "he-IL", "ILS", "Asia/Jerusalem", 31.7683, 35.2137, "he-IL,he;q=0.9,en;q=0.8"],
  ["ZA", "en-ZA", "ZAR", "Africa/Johannesburg", -26.2041, 28.0473, "en-ZA,en;q=0.9"],
];

function toProfile([, locale, currency, timezoneId, lat, lon, accept]: Row): CountryProfile {
  const primary = locale.split("-", 1)[0];
  return {
    locale,
    currency,
    timezoneId,
    geolocation: { latitude: lat, longitude: lon },
    acceptLanguage: accept ?? `${locale},${primary};q=0.9,en;q=0.8`,
  };
}

/** Profils indexés par code pays (majuscules). */
export const COUNTRY_PROFILES: Record<string, CountryProfile> = Object.fromEntries(
  ROWS.map((row) => [row[0], toProfile(row)]),
);

/** Inverse locale -> code pays (pour inférer le pays depuis une locale). */
export const LOCALE_COUNTRY_HINTS: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_PROFILES).map(([code, p]) => [p.locale, code]),
);
