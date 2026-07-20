import { afterEach, describe, expect, test } from "bun:test";
import { createServer } from "node:net";
import { fetchFast } from "../../src/net/fetch-fast.js";
import { PrivateNetworkBlockedError } from "../../src/net/private-net-guard.js";

// Proves `assertNetworkAllowed` runs PRE-SEND inside `fetchFast` (the single
// choke point for browser_fetch/browser_fetch_batch/browser_crawl): a real
// TCP listener records every connection attempt, so a blocked URL reaching
// it at all — even a bare SYN, no HTTP request needed — would be a
// regression back to "check happens, but the network call still fires".
const ORIGINAL = process.env.FUSE_BLOCK_PRIVATE_NETS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FUSE_BLOCK_PRIVATE_NETS;
  else process.env.FUSE_BLOCK_PRIVATE_NETS = ORIGINAL;
});

describe("fetchFast — pre-send block, zero connections for a blocked URL", () => {
  test("a blocked loopback URL never reaches the listening TCP server", async () => {
    let connections = 0;
    const server = createServer((socket) => {
      connections++;
      socket.destroy();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    try {
      await expect(fetchFast(`http://127.0.0.1:${port}/`)).rejects.toThrow(PrivateNetworkBlockedError);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    expect(connections).toBe(0);
  });
});
