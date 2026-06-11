/**
 * Per-session native dialog handling (alert/confirm/prompt/beforeunload):
 * a mutable policy applied to upcoming dialogs plus a ring buffer of the last
 * observed dialogs. State lives in a WeakMap keyed on the SessionData object,
 * so nothing needs to be added to session.ts internals.
 * @module session/dialogs
 */
import type { Dialog, Page } from "playwright";
import type { SessionData } from "./session.js";

/** Policy applied to dialogs as they appear. */
export interface DialogPolicy {
  action: "accept" | "dismiss";
  /** Text typed into `prompt` dialogs when accepting. */
  promptText?: string;
}

/** One observed dialog, recorded in the per-session ring buffer. */
export interface DialogRecord {
  type: string;
  message: string;
  at: number;
  /** How the policy resolved it. */
  handled: "accept" | "dismiss";
}

/** Ring buffer capacity (most recent dialogs kept). */
const MAX_DIALOGS = 20;

/** Internal per-session dialog state. */
interface DialogState {
  policy: DialogPolicy;
  recent: DialogRecord[];
  /** Pages already wired, for idempotent attachment (identity guard). */
  pages: WeakSet<Page>;
}

const states = new WeakMap<SessionData, DialogState>();

/** Get or lazily create the state for a session (default policy: dismiss). */
function stateFor(session: SessionData): DialogState {
  let state = states.get(session);
  if (!state) {
    state = { policy: { action: "dismiss" }, recent: [], pages: new WeakSet() };
    states.set(session, state);
  }
  return state;
}

/** Apply the current policy to one dialog and record it (ring of 20). */
async function handleDialog(state: DialogState, dialog: Dialog): Promise<void> {
  const { action, promptText } = state.policy;
  state.recent.push({ type: dialog.type(), message: dialog.message(), at: Date.now(), handled: action });
  if (state.recent.length > MAX_DIALOGS) state.recent.shift();
  // .catch: the dialog may already be handled (e.g. page closed underneath).
  if (action === "accept") {
    await dialog.accept(dialog.type() === "prompt" ? promptText : undefined).catch(() => {});
  } else {
    await dialog.dismiss().catch(() => {});
  }
}

/**
 * Wire the dialog handler onto the session's current page, applying the
 * session policy to every dialog. Idempotent per page (identity guard, like
 * session/health.ts): re-calling with the same page never doubles handlers,
 * while a recovered page gets wired fresh.
 *
 * @param session - The live session whose `page` to watch.
 */
export function attachDialogs(session: SessionData): void {
  const state = stateFor(session);
  const page = session.page;
  if (state.pages.has(page)) return;
  state.pages.add(page);
  page.on("dialog", (dialog) => void handleDialog(state, dialog));
}

/**
 * Set the policy applied to upcoming dialogs.
 *
 * @param session - The live session.
 * @param policy - Action (accept/dismiss) and optional prompt text.
 */
export function setDialogPolicy(session: SessionData, policy: DialogPolicy): void {
  stateFor(session).policy = policy;
}

/**
 * The last dialogs observed on this session (oldest first, max 20).
 *
 * @param session - The live session.
 */
export function recentDialogs(session: SessionData): DialogRecord[] {
  return [...stateFor(session).recent];
}
