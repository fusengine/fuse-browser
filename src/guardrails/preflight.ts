/**
 * Guardrails: block irreversible actions without human approval.
 * @module guardrails/preflight
 */

/** Words that trigger a human-approval requirement (payment/booking). */
export const SENSITIVE_WORDS =
  /\b(pay|payment|checkout|card|book|booking|reserve|reservation|confirm|ticket|purchase|acheter|payer|réserver|reserver|confirmer)\b/i;

/** Result of the actions preflight. */
export interface PreflightResult {
  allowed: boolean;
  reason: string;
  blockedActions: string[];
}

/** Minimal shape of an action evaluated by the preflight. */
type ActionLike = { type?: string; target?: string; text?: string } & Record<string, unknown>;

function targetOf(action: ActionLike): string {
  return String(action.target ?? action.text ?? JSON.stringify(action));
}

/**
 * Check the actions: if one targets a sensitive operation and no human approval
 * is provided, deny execution.
 */
export function preflight(actions: ActionLike[], humanApproved: boolean): PreflightResult {
  const blocked: string[] = [];
  for (const action of actions) {
    const target = targetOf(action);
    const haystack = `${action.type ?? ""} ${target}`;
    if (SENSITIVE_WORDS.test(haystack)) blocked.push(target);
  }
  if (blocked.length > 0 && !humanApproved) {
    return { allowed: false, reason: "human_approval_required", blockedActions: blocked };
  }
  return { allowed: true, reason: "ok", blockedActions: [] };
}
