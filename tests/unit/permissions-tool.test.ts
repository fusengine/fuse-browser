import { describe, expect, test } from "bun:test";
import type { BrowserContext } from "playwright";
import { applyPermissions } from "../../src/server/tools/permissions.js";

/** Fake context recording grant/clear calls. */
function fakeContext() {
  const grants: Array<{ perms: string[]; opts?: { origin: string } }> = [];
  let cleared = 0;
  const context = {
    async grantPermissions(perms: string[], opts?: { origin: string }): Promise<void> {
      grants.push({ perms, opts });
    },
    async clearPermissions(): Promise<void> {
      cleared += 1;
    },
  } as unknown as BrowserContext;
  return { context, grants, cleared: () => cleared };
}

describe("applyPermissions", () => {
  test("grant forwards permissions without origin when none given", async () => {
    const { context, grants } = fakeContext();
    await applyPermissions(context, "grant", ["geolocation", "notifications"]);
    expect(grants).toEqual([{ perms: ["geolocation", "notifications"], opts: undefined }]);
  });

  test("grant scopes to an origin when provided", async () => {
    const { context, grants } = fakeContext();
    await applyPermissions(context, "grant", ["clipboard-read"], "https://x.com");
    expect(grants).toEqual([
      { perms: ["clipboard-read"], opts: { origin: "https://x.com" } },
    ]);
  });

  test("clear revokes all and never grants", async () => {
    const { context, grants, cleared } = fakeContext();
    await applyPermissions(context, "clear", []);
    expect(cleared()).toBe(1);
    expect(grants).toHaveLength(0);
  });
});
