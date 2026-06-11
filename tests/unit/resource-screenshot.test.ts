import { describe, expect, test } from "bun:test";
import { SessionNotFoundError } from "../../src/lib/errors.js";
import type { SessionManager } from "../../src/session/manager.js";
import {
  captureSessionScreenshot,
  isSessionMissing,
} from "../../src/server/resource-screenshot.js";

/** Minimal SessionManager stub: `get` either returns a fake page or throws. */
function stubSessions(shot: Buffer | Error): SessionManager {
  const page = { screenshot: async () => shot };
  return {
    get: (id: string) => {
      if (shot instanceof Error) throw shot;
      return { id, page };
    },
  } as unknown as SessionManager;
}

describe("captureSessionScreenshot", () => {
  test("returns a base64 JPEG blob echoing the URI", async () => {
    const sessions = stubSessions(Buffer.from("JPEGBYTES"));
    const out = await captureSessionScreenshot(sessions, "abc", "screenshot://abc/last");
    expect(out.contents).toEqual([
      {
        uri: "screenshot://abc/last",
        mimeType: "image/jpeg",
        blob: Buffer.from("JPEGBYTES").toString("base64"),
      },
    ]);
  });

  test("propagates SessionNotFoundError when the session is gone", async () => {
    const sessions = stubSessions(new SessionNotFoundError("abc"));
    const promise = captureSessionScreenshot(sessions, "abc", "screenshot://abc/last");
    await expect(promise).rejects.toBeInstanceOf(SessionNotFoundError);
  });
});

describe("isSessionMissing", () => {
  test("true only for SessionNotFoundError", () => {
    expect(isSessionMissing(new SessionNotFoundError("x"))).toBe(true);
    expect(isSessionMissing(new Error("other"))).toBe(false);
    expect(isSessionMissing("nope")).toBe(false);
  });
});
