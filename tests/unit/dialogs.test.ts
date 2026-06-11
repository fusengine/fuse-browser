import { describe, expect, test } from "bun:test";
import { attachDialogs, recentDialogs, setDialogPolicy } from "../../src/session/dialogs.js";
import type { SessionData } from "../../src/session/session.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Minimal Playwright Dialog stand-in tracking how it was resolved. */
class FakeDialog {
  acceptCalled = false;
  acceptText: string | undefined;
  dismissCalled = false;
  constructor(private kind: string, private msg: string, private failResolve = false) {}
  type = (): string => this.kind;
  message = (): string => this.msg;
  accept = async (text?: string): Promise<void> => {
    if (this.failResolve) throw new Error("already handled");
    this.acceptCalled = true;
    this.acceptText = text;
  };
  dismiss = async (): Promise<void> => {
    if (this.failResolve) throw new Error("already handled");
    this.dismissCalled = true;
  };
}

/** Fake page capturing `dialog` handlers + session stub (state is WeakMap-keyed). */
function fixture() {
  const handlers: Array<(d: FakeDialog) => void> = [];
  const page = {
    on(event: string, handler: (d: FakeDialog) => void): void {
      if (event === "dialog") handlers.push(handler);
    },
  };
  const session = { id: "s", page } as unknown as SessionData;
  return { session, handlers, emit: (d: FakeDialog) => handlers.forEach((h) => h(d)) };
}

describe("dialogs policy", () => {
  test("default policy dismisses dialogs and records them", async () => {
    const { session, emit } = fixture();
    attachDialogs(session);
    const dialog = new FakeDialog("confirm", "sure?");
    emit(dialog);
    await tick();
    expect(dialog.dismissCalled).toBe(true);
    expect(dialog.acceptCalled).toBe(false);
    expect(recentDialogs(session)).toEqual([
      { type: "confirm", message: "sure?", at: expect.any(Number), handled: "dismiss" },
    ]);
  });

  test("accept fills prompts with promptText, others without text", async () => {
    const { session, emit } = fixture();
    attachDialogs(session);
    setDialogPolicy(session, { action: "accept", promptText: "hello" });
    const prompt = new FakeDialog("prompt", "name?");
    const confirm = new FakeDialog("confirm", "ok?");
    emit(prompt);
    emit(confirm);
    await tick();
    expect(prompt.acceptCalled).toBe(true);
    expect(prompt.acceptText).toBe("hello");
    expect(confirm.acceptCalled).toBe(true);
    expect(confirm.acceptText).toBeUndefined();
    expect(recentDialogs(session).map((d) => d.handled)).toEqual(["accept", "accept"]);
  });

  test("a rejected accept is swallowed but still recorded", async () => {
    const { session, emit } = fixture();
    attachDialogs(session);
    setDialogPolicy(session, { action: "accept" });
    emit(new FakeDialog("alert", "late", true));
    await tick();
    expect(recentDialogs(session)).toHaveLength(1);
  });
});

describe("dialogs ring buffer and idempotence", () => {
  test("keeps only the 20 most recent dialogs", async () => {
    const { session, emit } = fixture();
    attachDialogs(session);
    for (let i = 1; i <= 25; i += 1) emit(new FakeDialog("alert", `msg-${i}`));
    await tick();
    const recent = recentDialogs(session);
    expect(recent).toHaveLength(20);
    expect(recent[0]?.message).toBe("msg-6");
    expect(recent[19]?.message).toBe("msg-25");
  });

  test("attachDialogs is idempotent per page", () => {
    const { session, handlers } = fixture();
    attachDialogs(session);
    attachDialogs(session);
    expect(handlers).toHaveLength(1);
  });
});
