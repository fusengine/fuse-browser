/**
 * Typed domain errors.
 * @module lib/errors
 */

/** Thrown when an irreversible action is attempted without human approval. */
export class GuardrailViolation extends Error {
  readonly reason: string;
  readonly blockedActions: string[];

  constructor(reason: string, blockedActions: string[]) {
    super(`Action blocked: ${reason}: ${blockedActions.join(", ")}`);
    this.name = "GuardrailViolation";
    this.reason = reason;
    this.blockedActions = blockedActions;
  }
}

/** Thrown when `respectRobots` is enabled and the target URL is disallowed by robots.txt. */
export class RobotsDisallowed extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`Blocked by robots.txt: ${url}`);
    this.name = "RobotsDisallowed";
    this.url = url;
  }
}

/** Thrown when a referenced browser session no longer exists. */
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

/** Thrown when the concurrent-session cap is reached (prevents OOM). */
export class SessionLimitError extends Error {
  constructor(limit: number) {
    super(`Concurrent session limit reached: ${limit}`);
    this.name = "SessionLimitError";
  }
}

/**
 * Thrown when a session's browser/context is gone (disconnect, context close)
 * and the page cannot be recreated within it — the session must be reopened.
 */
export class BrowserLostError extends Error {
  constructor(sessionId: string) {
    super(`Browser lost for session ${sessionId}: reopen with browser_open`);
    this.name = "BrowserLostError";
  }
}

/**
 * Thrown when the per-host circuit breaker is open: the origin failed
 * repeatedly and is in cooldown, so the request fails fast instead of
 * burning browser time. Retry after `retryInMs`.
 */
export class CircuitOpenError extends Error {
  readonly origin: string;
  readonly retryInMs: number;

  constructor(origin: string, retryInMs: number) {
    super(`Circuit open for ${origin}: retry in ${Math.ceil(retryInMs / 1000)}s`);
    this.name = "CircuitOpenError";
    this.origin = origin;
    this.retryInMs = retryInMs;
  }
}
