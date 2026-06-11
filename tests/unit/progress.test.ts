import { describe, expect, test } from "bun:test";
import { type ProgressFn, progressReporter, type ToolExtra } from "../../src/server/progress.js";

/** Build a fake `extra` capturing sent notifications (optionally rejecting). */
function fakeExtra(progressToken?: string | number, reject = false) {
  const sent: unknown[] = [];
  const extra = {
    _meta: progressToken === undefined ? undefined : { progressToken },
    sendNotification: (n: unknown) => {
      sent.push(n);
      return reject ? Promise.reject(new Error("transport down")) : Promise.resolve();
    },
  } as unknown as ToolExtra;
  return { extra, sent };
}

describe("progressReporter", () => {
  test("is a silent no-op when the client sent no progressToken", () => {
    const { extra, sent } = fakeExtra(undefined);
    const report: ProgressFn = progressReporter(extra);
    expect(() => report(4, 12, "page 4")).not.toThrow();
    expect(sent).toHaveLength(0);
  });

  test("no-op too when _meta exists but has no progressToken", () => {
    const { extra, sent } = fakeExtra(undefined);
    (extra as { _meta?: object })._meta = {};
    progressReporter(extra)(1, 2);
    expect(sent).toHaveLength(0);
  });

  test("emits a notifications/progress per call with token, progress, total, message", () => {
    const { extra, sent } = fakeExtra("tok-1");
    const report = progressReporter(extra);
    report(4, 12, "https://a.example");
    report(5, 12);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toEqual({
      method: "notifications/progress",
      params: { progressToken: "tok-1", progress: 4, total: 12, message: "https://a.example" },
    });
    expect(sent[1]).toEqual({
      method: "notifications/progress",
      params: { progressToken: "tok-1", progress: 5, total: 12 },
    });
  });

  test("supports numeric progress tokens (JSON-RPC ids)", () => {
    const { extra, sent } = fakeExtra(7);
    progressReporter(extra)(1, 3, "q1");
    expect(sent[0]).toMatchObject({ params: { progressToken: 7, progress: 1, total: 3 } });
  });

  test("never throws nor leaves an unhandled rejection when sendNotification rejects", async () => {
    const { extra, sent } = fakeExtra("tok-2", true);
    const report = progressReporter(extra);
    expect(() => report(1, 2, "boom-item")).not.toThrow();
    await Bun.sleep(0); // flush microtasks: the rejection must be swallowed
    expect(sent).toHaveLength(1);
  });
});
