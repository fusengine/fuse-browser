/**
 * CDP screencast on a live page: emits base64 JPEG frames to a callback. Each
 * frame is acked with its own `sessionId` (mandatory — the stream stalls after
 * frame 1 otherwise), and the screencast is re-issued on navigation (it stops
 * on a hard nav). Chromium only; works headless.
 * @module live/screencast
 */
import type { CDPSession, Page } from "playwright";

/** Screencast frame quality/size knobs. */
export interface ScreencastOptions {
  quality: number;
  maxWidth: number;
  maxHeight: number;
}

interface ScreencastFrame {
  data: string;
  sessionId: number;
}

/**
 * Start a CDP screencast on `page`, invoking `onFrame` with each base64 JPEG.
 *
 * @param page - The live Playwright page (Chromium).
 * @param opts - Frame quality and max dimensions.
 * @param onFrame - Called with the base64 JPEG of every frame.
 * @returns A stop function that ends the screencast and detaches the session.
 */
export async function startScreencast(
  page: Page,
  opts: ScreencastOptions,
  onFrame: (base64: string) => void,
): Promise<() => Promise<void>> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const begin = (): Promise<unknown> =>
    cdp
      .send("Page.startScreencast", {
        format: "jpeg",
        quality: opts.quality,
        maxWidth: opts.maxWidth,
        maxHeight: opts.maxHeight,
        everyNthFrame: 1,
      })
      .catch(() => undefined);
  cdp.on("Page.screencastFrame", (frame: ScreencastFrame) => {
    // Ack FIRST (with the frame's own sessionId) or the stream stalls.
    void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => undefined);
    onFrame(frame.data);
  });
  const onLoad = (): void => void begin();
  page.on("load", onLoad);
  await begin();
  return async () => {
    page.off("load", onLoad);
    await cdp.send("Page.stopScreencast").catch(() => undefined);
    await cdp.detach().catch(() => undefined);
  };
}
