import { describe, expect, test } from "bun:test";
import { type ClosableServer, closeServerHardened } from "../../src/engine/close-server.js";

/** A controllable fake server: `close()` behaviour is driven per test; `kill()` is counted. */
function makeServer(opts: { close: () => Promise<void>; kill?: () => Promise<void> }): {
  server: ClosableServer;
  calls: { kill: number };
} {
  const calls = { kill: 0 };
  const server: ClosableServer = {
    close: opts.close,
    kill: async () => {
      calls.kill++;
      if (opts.kill) await opts.kill();
    },
  };
  return { server, calls };
}

/** A close() that never settles, to exercise the stall path deterministically. */
const neverResolves = (): Promise<void> => new Promise<void>(() => {});

describe("closeServerHardened", () => {
  test("stalled close -> force-kills and still resolves", async () => {
    const { server, calls } = makeServer({ close: neverResolves });
    await closeServerHardened(server, 10);
    expect(calls.kill).toBe(1);
  });

  test("fast graceful close -> never kills", async () => {
    const { server, calls } = makeServer({ close: async () => {} });
    await closeServerHardened(server, 5_000);
    expect(calls.kill).toBe(0);
  });

  test("kill() rejection (process already dead) is swallowed, no throw", async () => {
    const { server } = makeServer({
      close: neverResolves,
      kill: async () => {
        throw new Error("ESRCH");
      },
    });
    await expect(closeServerHardened(server, 10)).resolves.toBeUndefined();
  });

  test("a late close() rejection after the kill branch never escapes", async () => {
    const { server } = makeServer({
      close: () => new Promise<void>((_, reject) => setTimeout(() => reject(new Error("late")), 20)),
    });
    await expect(closeServerHardened(server, 5)).resolves.toBeUndefined();
    await new Promise((r) => setTimeout(r, 40)); // let the late rejection fire — must stay handled
  });
});
