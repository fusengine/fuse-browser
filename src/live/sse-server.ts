/**
 * Ephemeral localhost SSE server for the live view. Binds 127.0.0.1 on an
 * OS-assigned port, gates every request on a token, serves the viewer HTML at
 * `/` and a `text/event-stream` of base64 JPEG frames at `/stream`.
 * @module live/sse-server
 */
import { createServer, type ServerResponse } from "node:http";
import { VIEWER_HTML } from "./viewer-html.js";

/** A running live-view server. */
export interface LiveServer {
  /** Viewer URL (includes the access token). */
  url: string;
  /** Push a base64 JPEG frame to every connected viewer. */
  broadcast(base64: string): void;
  /** Close all streams and stop the server. */
  close(): Promise<void>;
}

/** Start the token-gated SSE server bound to loopback. */
export async function startSseServer(token: string): Promise<LiveServer> {
  const clients = new Set<ServerResponse>();
  const server = createServer((req, res) => {
    const u = new URL(req.url ?? "/", "http://127.0.0.1");
    if (u.searchParams.get("token") !== token) {
      res.writeHead(403).end("forbidden");
      return;
    }
    if (u.pathname === "/stream") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(VIEWER_HTML);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return {
    url: `http://127.0.0.1:${port}/?token=${token}`,
    broadcast(base64) {
      const chunk = `data: ${base64}\n\n`;
      for (const res of clients) {
        if (res.writableEnded || res.destroyed) {
          clients.delete(res);
          continue;
        }
        // Async EPIPE/ECONNRESET (client gone mid-frame) arrives in the callback,
        // not as a throw — handle it here so it never crashes the process.
        res.write(chunk, (err) => {
          if (err) clients.delete(res);
        });
      }
    },
    async close() {
      for (const res of clients) res.end();
      clients.clear();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
