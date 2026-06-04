/**
 * Unit tests for the bounded probe queue + budget. Deterministic: tasks are
 * controllable deferreds, so concurrency/FIFO/queue-full/budget are asserted
 * without timers.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { BudgetExhaustedError, QueueFullError } from "../../src/lib/errors.js";
import type { ProbeQueueConfig } from "../../src/interfaces/net.js";
import { withQueue } from "../../src/net/queue-guard.js";
import { resetQueue } from "../../src/net/probe-queue.js";

const CFG: ProbeQueueConfig = { concurrency: 2, maxQueue: 2, maxProbes: 0 };

/** A task whose completion the test controls. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => resetQueue());

describe("probe queue", () => {
  test("disabled (null cfg) is a transparent pass-through", async () => {
    expect(await withQueue(null, async () => 42)).toBe(42);
  });

  test("runs up to concurrency in parallel, queues the rest", async () => {
    const d = [deferred(), deferred(), deferred()];
    const started: number[] = [];
    const runs = d.map((def, i) =>
      withQueue(CFG, async () => {
        started.push(i);
        await def.promise;
      }),
    );
    await Promise.resolve(); // let synchronous acquires settle
    expect(started).toEqual([0, 1]); // 2 concurrent, #2 waits
    d[0]!.resolve();
    await runs[0];
    expect(started).toContain(2); // slot freed → #2 starts
    d[1]!.resolve();
    d[2]!.resolve();
    await Promise.all(runs);
  });

  test("rejects fast with QueueFullError when the waiting list is full", async () => {
    const d = [deferred(), deferred(), deferred(), deferred()];
    // 2 running + 2 queued = full
    const runs = d.map((def) => withQueue(CFG, async () => def.promise));
    await Promise.resolve();
    await expect(withQueue(CFG, async () => "overflow")).rejects.toBeInstanceOf(QueueFullError);
    d.forEach((x) => x.resolve());
    await Promise.all(runs);
  });

  test("enforces a per-process budget with BudgetExhaustedError", async () => {
    const cfg: ProbeQueueConfig = { concurrency: 5, maxQueue: 5, maxProbes: 2 };
    await withQueue(cfg, async () => "a");
    await withQueue(cfg, async () => "b");
    await expect(withQueue(cfg, async () => "c")).rejects.toBeInstanceOf(BudgetExhaustedError);
  });

  test("releases the slot even when the task throws", async () => {
    const cfg: ProbeQueueConfig = { concurrency: 1, maxQueue: 1, maxProbes: 0 };
    await expect(
      withQueue(cfg, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    // Slot must be free again — this would hang/reject if it leaked.
    expect(await withQueue(cfg, async () => "ok")).toBe("ok");
  });
});
