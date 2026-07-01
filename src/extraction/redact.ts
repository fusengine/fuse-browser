/**
 * Tier 2 vault protection: scrub known session secrets from snapshot output
 * before it reaches the LLM. Tier 1 already nulls `input[type=password]`
 * values browser-side; this catches any tainted secret (password/TOTP) that
 * still surfaced in a `value` or `text` field. Exact substring replacement is
 * safe for the high-entropy secrets the vault holds.
 * @module extraction/redact
 */
import type { InteractiveElement } from "../interfaces/extraction.js";

/** Placeholder shown in place of a redacted secret. */
const MASK = "•••";

/** Replace every occurrence of each secret in `text` with the mask. */
function scrub(text: string, secrets: Set<string>): string {
  let out = text;
  for (const secret of secrets) {
    if (secret && out.includes(secret)) out = out.split(secret).join(MASK);
  }
  return out;
}

/**
 * Redact tainted secrets from each element's `value`/`text` in place, then
 * return the same array. No-op (and no allocation) when the taint-set is empty.
 *
 * @param elements - Snapshot elements about to be returned to the client.
 * @param secrets - Session taint-set of live secret values.
 * @returns The (possibly mutated) `elements` array.
 */
export function redactElements(
  elements: InteractiveElement[],
  secrets: Set<string>,
): InteractiveElement[] {
  if (secrets.size === 0) return elements;
  for (const el of elements) {
    if (typeof el.value === "string") el.value = scrub(el.value, secrets);
    if (typeof el.text === "string") el.text = scrub(el.text, secrets);
  }
  return elements;
}
