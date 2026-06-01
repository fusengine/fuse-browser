/**
 * Routeur proxy par pays.
 * @module proxy/country-map
 */
import { existsSync } from "node:fs";
import { readJsonSafe } from "../lib/fs.js";

/** Normalise une table pays->proxy (clés en majuscules, valeurs non vides). */
function normalize(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v) out[k.toUpperCase()] = String(v);
  }
  return out;
}

/**
 * Charge la table pays->proxy depuis un fichier JSON puis fusionne une table
 * inline (cette dernière a priorité).
 */
export function loadProxyCountryMap(
  inline?: Record<string, string>,
  mapPath?: string,
): Record<string, string> {
  let loaded: Record<string, string> = {};
  if (mapPath && existsSync(mapPath)) {
    loaded = normalize(readJsonSafe<Record<string, unknown>>(mapPath, {}));
  }
  if (inline) loaded = { ...loaded, ...normalize(inline) };
  return loaded;
}

/** Source de sélection du proxy effectif. */
export type ProxySource = "explicit" | "country_map" | null;

/** Sélectionne le proxy effectif : explicite > table pays. */
export function resolveProxy(
  explicit: string | undefined,
  countryCode: string,
  map: Record<string, string>,
): { proxyUrl: string | null; proxySource: ProxySource } {
  if (explicit) return { proxyUrl: explicit, proxySource: "explicit" };
  const fromMap = map[countryCode];
  if (fromMap) return { proxyUrl: fromMap, proxySource: "country_map" };
  return { proxyUrl: null, proxySource: null };
}
