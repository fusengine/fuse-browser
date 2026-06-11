/**
 * Per-id TTL timers guarded by a busy counter: expiry is deferred while a
 * session is in use by a tool, instead of closing it mid-call.
 * @module session/ttl-guard
 */

/** Schedules per-id expiry timers and defers them while the id is busy. */
export class TtlGuard {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly busy = new Map<string, number>();

  /**
   * @param ttlMs - Idle TTL before `onExpire` fires (ms).
   * @param onExpire - Called when an id expires while not busy.
   */
  constructor(
    private readonly ttlMs: number,
    private readonly onExpire: (id: string) => void,
  ) {}

  /** (Re)schedule the expiry timer for an id. */
  schedule(id: string): void {
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.expire(id), this.ttlMs);
    timer.unref?.();
    this.timers.set(id, timer);
  }

  /** Timer callback: reschedule while busy, expire otherwise. */
  private expire(id: string): void {
    if ((this.busy.get(id) ?? 0) > 0) {
      this.schedule(id);
      return;
    }
    this.onExpire(id);
  }

  /** Increment the busy count (a tool is holding the session). */
  markBusy(id: string): void {
    this.busy.set(id, (this.busy.get(id) ?? 0) + 1);
  }

  /** Decrement the busy count (never below zero). */
  markIdle(id: string): void {
    const next = Math.max(0, (this.busy.get(id) ?? 0) - 1);
    if (next === 0) this.busy.delete(id);
    else this.busy.set(id, next);
  }

  /** Drop the timer and busy entry for an id (explicit close). */
  clear(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.busy.delete(id);
  }
}
