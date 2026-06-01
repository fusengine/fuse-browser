/**
 * Logger structuré sur stderr.
 * stdout est réservé au framing JSON-RPC du transport MCP stdio :
 * tout log applicatif doit donc passer par stderr.
 * @module lib/logger
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const threshold = LEVELS[(process.env.FUSE_LOG_LEVEL as Level) ?? "info"] ?? LEVELS.info;

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;
  const entry = { level, message, ...(meta ? { meta } : {}) };
  process.stderr.write(`${JSON.stringify(entry)}\n`);
}

/** Logger minimal écrivant du JSON ligne par ligne sur stderr. */
export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
