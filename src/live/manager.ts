/**
 * Live-view manager: ties a session to an ephemeral SSE server fed by a CDP
 * screencast of its page. One live view per session; starting again replaces
 * the previous one. Auto-stops when the page closes.
 * @module live/manager
 */
import { randomBytes } from "node:crypto";
import type { SessionData } from "../session/session.js";
import { openUrl } from "./open-url.js";
import { startScreencast, type ScreencastOptions } from "./screencast.js";
import { type LiveServer, startSseServer } from "./sse-server.js";

interface LiveView {
  url: string;
  stop: () => Promise<void>;
}

const views = new Map<string, LiveView>();

/** Options for {@link startLiveView}. */
export interface LiveViewOptions extends ScreencastOptions {
  /** Open the viewer in the OS default browser (default true). */
  open: boolean;
}

/**
 * Start (or restart) the live view for a session and return the viewer URL.
 *
 * @param session - The live session whose page to stream.
 * @param opts - Frame quality/size and whether to auto-open the viewer.
 * @remarks The screencast binds to the page live at call time. If the page is
 * later recreated by crash recovery (B1), the stream tears down with the old
 * page (no silent leak) but does not auto-reattach — call `browser_live_view`
 * again after a recovery to resume watching.
 */
export async function startLiveView(session: SessionData, opts: LiveViewOptions): Promise<string> {
  await stopLiveView(session.id);
  const token = randomBytes(16).toString("hex");
  const server: LiveServer = await startSseServer(token);
  const stopCast = await startScreencast(session.page, opts, (b64) => server.broadcast(b64));
  views.set(session.id, {
    url: server.url,
    stop: async () => {
      await stopCast();
      await server.close();
    },
  });
  session.page.once("close", () => void stopLiveView(session.id));
  if (opts.open) openUrl(server.url);
  return server.url;
}

/** Stop a session's live view; returns false if none was running. */
export async function stopLiveView(id: string): Promise<boolean> {
  const view = views.get(id);
  if (!view) return false;
  views.delete(id);
  await view.stop();
  return true;
}
