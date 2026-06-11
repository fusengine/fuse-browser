/**
 * Minimal HTTP forward proxy for the live profile check: serves the fake
 * origin `http://live.example.com/` itself (real `Set-Cookie` + localStorage
 * page), tunnels CONNECT (https) to the real host, and records the last
 * `Cookie` request header it sees — proving a storage-state reload.
 * @module tests/live/live-proxy
 */
import { createServer } from "node:http";
import { connect as netConnect, type Socket } from "node:net";

/** Fake origin served by the proxy (real example.com stays CONNECT-tunneled). */
export const FAKE_ORIGIN = "live.example.com";

/** HTML served on the fake origin: sets localStorage so the origin is persisted. */
const PAGE = '<html><body>live<script>localStorage.setItem("fuse", "live");</script></body></html>';

/** Running proxy handle. */
export interface CookieProxy {
  /** Ephemeral listen port on 127.0.0.1. */
  port: number;
  /** Last `Cookie` request header received on the fake origin. */
  lastCookie: () => string | undefined;
  /** Stop the server. */
  close: () => Promise<void>;
}

/**
 * Start the proxy on an ephemeral 127.0.0.1 port.
 * @returns Handle with the port, the last seen Cookie header, and a closer.
 */
export async function startCookieProxy(): Promise<CookieProxy> {
  let lastCookie: string | undefined;
  const tunnels = new Set<Socket>();
  const server = createServer((req, res) => {
    if (String(req.url).includes(FAKE_ORIGIN)) {
      lastCookie = req.headers.cookie ?? lastCookie;
      res.writeHead(200, { "content-type": "text/html", "set-cookie": "fuse=live; Path=/" });
      res.end(PAGE);
      return;
    }
    res.writeHead(502, { "content-type": "text/plain" });
    res.end("proxy: only the fake origin is served over plain http");
  });
  server.on("connect", (req, clientSocket, head) => {
    const [host, port] = String(req.url).split(":");
    const upstream = netConnect(Number(port ?? "443"), host ?? "", () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    tunnels.add(clientSocket).add(upstream);
    const drop = (s: Socket) => {
      tunnels.delete(s);
      s.destroy();
    };
    upstream.on("error", () => drop(clientSocket)).on("close", () => tunnels.delete(upstream));
    clientSocket.on("error", () => drop(upstream)).on("close", () => tunnels.delete(clientSocket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr !== null ? addr.port : 0;
  return {
    port,
    lastCookie: () => lastCookie,
    close: () =>
      new Promise((resolve) => {
        for (const s of tunnels) s.destroy();
        tunnels.clear();
        server.close(() => resolve());
      }),
  };
}
