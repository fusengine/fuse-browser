/**
 * Types for the auto-scroll action.
 * @module interfaces/auto-scroll
 */

/** Tuning options for `autoScroll`. */
export interface AutoScrollOpts {
  /** Hard cap on scroll rounds (default 20). */
  maxScrolls?: number;
  /** Consecutive rounds without growth before stopping (default 2). */
  idleRounds?: number;
  /** CSS selector whose element count is the stop signal. */
  untilSelector?: string;
  /** Element count that satisfies `untilSelector` (default 1). */
  minCount?: number;
  /** Delay between scrolls in ms (default 600). */
  delayMs?: number;
}

/** Outcome of one scroll round, measured in the page. */
export interface ScrollProbe {
  height: number;
  count: number;
}

/** Inputs for the pure stop decision. */
export interface StopInput {
  prev: ScrollProbe | null;
  curr: ScrollProbe;
  idle: number;
  rounds: number;
  idleRounds: number;
  maxScrolls: number;
  minCount: number;
  hasSelector: boolean;
}

/** Next loop state after evaluating a round. */
export interface StopState {
  stop: boolean;
  idle: number;
}
