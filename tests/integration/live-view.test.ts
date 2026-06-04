/**
 * End-to-end test for the human live view: start a CDP screencast on a real
 * headless session, connect to the ephemeral SSE server, and assert at least
 * one base64 JPEG frame arrives. Then stop and verify teardown.
 */
import assert from "node:assert/strict";
import { get } from "node:http";
import { test } from "node:test";
import { resolveConfig } from "../../src/agent/config.js";
import { startLiveView, stopLiveView } from "../../src/live/manager.js";
import { SessionManager } from "../../src/session/manager.js";

/** Resolve with the first SSE frame's base64 payload, or reject on timeout. */
function firstFrame(streamUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error("no frame within 15s"));
    }, 15_000);
    const req = get(streamUrl, (res) => {
      let buf = "";
      res.on("data", (chunk: Buffer) => {
        buf += chunk.toString("utf8");
        const m = buf.match(/data: (.+)\n\n/);
        if (m?.[1]) {
          clearTimeout(timer);
          req.destroy();
          resolve(m[1]);
        }
      });
    });
    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

test("live view streams screencast frames over SSE then stops", { timeout: 120_000 }, async () => {
  const sessions = new SessionManager();
  const s = await sessions.open(resolveConfig({ headless: true, engine: "patchright" }));
  try {
    await s.page.goto("data:text/html,<h1 style='font-size:80px'>LIVE</h1>", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const url = await startLiveView(s, { quality: 50, maxWidth: 640, maxHeight: 480, open: false });
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/\?token=[a-f0-9]{32}$/, "viewer URL shape");

    const streamUrl = url.replace("/?token=", "/stream?token=");
    const frame = await firstFrame(streamUrl);
    assert.ok(frame.length > 100, "received a non-trivial base64 JPEG frame");
    assert.doesNotThrow(() => Buffer.from(frame, "base64"), "frame is valid base64");

    assert.equal(await stopLiveView(s.id), true, "stop returns true when running");
    assert.equal(await stopLiveView(s.id), false, "stop is idempotent");
  } finally {
    await sessions.close(s.id);
  }
});
