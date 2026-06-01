/**
 * Utilitaires texte/regex.
 * @module lib/text
 */

/** Échappe une chaîne pour une insertion littérale dans une RegExp. */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Entier pseudo-aléatoire dans [min, max] (jitter « humain », non cryptographique). */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
