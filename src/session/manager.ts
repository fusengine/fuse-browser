/**
 * Session lifecycle manager with per-session TTL cleanup and a concurrent cap.
 * @module session/manager
 */
import type { ResolvedConfig } from "../agent/config.js";
import { SessionLimitError, SessionNotFoundError } from "../lib/errors.js";
import { sha1 } from "../lib/fs.js";
import { closeSession } from "./close.js";
import { openSession, type SessionData } from "./session.js";
import { TtlGuard } from "./ttl-guard.js";

/** Options for the session manager. */
export interface SessionManagerOptions {
  /** Idle TTL before a session is auto-closed (ms). */
  ttlMs?: number;
  /** Maximum concurrent live sessions (guards against OOM). */
  maxSessions?: number;
}

/** Holds live sessions and closes them on TTL expiry or shutdown. */
export class SessionManager {
  private readonly sessions = new Map<string, SessionData>();
  private readonly guard: TtlGuard;
  private readonly ttlMs: number;
  private readonly maxSessions: number;
  private counter = 0;

  constructor(opts: SessionManagerOptions = {}) {
    this.ttlMs = opts.ttlMs ?? 300_000;
    this.maxSessions = opts.maxSessions ?? 8;
    this.guard = new TtlGuard(this.ttlMs, (id) => void this.close(id));
  }

  /**
   * Open a new session and schedule its TTL cleanup.
   * @throws {SessionLimitError} when the concurrent cap is reached.
   */
  async open(config: ResolvedConfig): Promise<SessionData> {
    if (this.sessions.size >= this.maxSessions) throw new SessionLimitError(this.maxSessions);
    this.counter += 1;
    const id = sha1(`${config.outputDir}-${Date.now()}-${this.counter}`).slice(0, 12);
    const session = await openSession(id, config, this.ttlMs);
    this.sessions.set(id, session);
    this.guard.schedule(id);
    return session;
  }

  /** Get a session (refreshing its TTL) or throw if missing. */
  get(id: string): SessionData {
    const session = this.sessions.get(id);
    if (!session) throw new SessionNotFoundError(id);
    this.touch(id);
    return session;
  }

  /** Refresh a session's TTL. */
  touch(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.expiresAt = Date.now() + this.ttlMs;
    this.guard.schedule(id);
  }

  /** Mark a session as in use by a tool, deferring TTL expiry. */
  markBusy(id: string): void {
    if (!this.sessions.has(id)) return;
    this.guard.markBusy(id);
  }

  /** Mark a session idle again and refresh its TTL. */
  markIdle(id: string): void {
    this.guard.markIdle(id);
    this.touch(id);
  }

  /** Close and remove a session (always, even if busy); false if missing. */
  async close(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;
    this.sessions.delete(id);
    this.guard.clear(id);
    await closeSession(session);
    return true;
  }

  /** Close every session (used on shutdown). */
  async closeAll(): Promise<void> {
    await Promise.allSettled([...this.sessions.keys()].map((id) => this.close(id)));
  }

  /** Snapshot of currently open sessions. */
  list(): SessionData[] {
    return [...this.sessions.values()];
  }
}
