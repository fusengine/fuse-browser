/**
 * MCP progress notifications for long-running batch tools. Builds a per-request
 * reporter from the tool callback's `extra`: silent no-op when the client sent
 * no `progressToken`, otherwise emits `notifications/progress` ("4/12") without
 * ever throwing or blocking the batch.
 * @module server/progress
 */
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";

/** The `extra` argument MCP tool callbacks receive from `registerTool`. */
export type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

/** Progress callback: `done` items finished out of `total`, optional label. */
export type ProgressFn = (done: number, total: number, message?: string) => void;

/**
 * Build a progress reporter bound to the current MCP request.
 *
 * @param extra - The tool callback's `extra` (carries `_meta.progressToken`).
 * @returns A `(done, total, message?)` callback. No-op when the client did not
 *   request progress; otherwise fire-and-forget (send errors are swallowed).
 */
export function progressReporter(extra: ToolExtra): ProgressFn {
  const progressToken = extra._meta?.progressToken;
  if (progressToken === undefined) return () => {};
  return (done, total, message) => {
    extra
      .sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: done, total, ...(message !== undefined ? { message } : {}) },
      })
      .catch(() => {});
  };
}
