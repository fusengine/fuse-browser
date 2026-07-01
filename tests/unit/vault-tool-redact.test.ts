import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { redactElements } from "../../src/extraction/redact.js";
import type { InteractiveElement } from "../../src/interfaces/extraction.js";
import type { SessionManager } from "../../src/session/manager.js";
import { registerVaultTool } from "../../src/server/tools/vault.js";
import { setEntry } from "../../src/vault/store.js";

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;

const prevHome = process.env.FUSE_BROWSER_HOME;
let dir = "";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "fuse-vtool-"));
  process.env.FUSE_BROWSER_HOME = dir;
  process.env.FUSE_VAULT_KEY = Buffer.alloc(32, 9).toString("base64");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (prevHome === undefined) delete process.env.FUSE_BROWSER_HOME;
  else process.env.FUSE_BROWSER_HOME = prevHome;
  delete process.env.FUSE_VAULT_KEY;
});

describe("browser_vault (list-only)", () => {
  test("returns metadata only, never a secret", async () => {
    setEntry("gh", { username: "u", password: "p@ss", origins: ["https://github.com"] });
    let handler: Handler | undefined;
    const server = {
      registerTool: (_n: string, _c: unknown, fn: Handler) => {
        handler = fn;
      },
    } as unknown as McpServer;
    registerVaultTool(server, {} as unknown as SessionManager);
    const res = await (handler as Handler)({ action: "list" });
    const creds = (res.structuredContent as { credentials: unknown[] }).credentials;
    expect(creds).toEqual([{ ref: "gh", username: "u", hasTotp: false, origins: ["https://github.com"] }]);
    expect(JSON.stringify(res)).not.toContain("p@ss");
  });
});

describe("redactElements (Tier 2)", () => {
  test("scrubs tainted secrets from value and text", () => {
    const els = [{ value: "p@ss", text: "logged in as p@ss" }] as unknown as InteractiveElement[];
    redactElements(els, new Set(["p@ss"]));
    expect(els[0]?.value).toBe("•••");
    expect(els[0]?.text).toBe("logged in as •••");
  });

  test("is a no-op with an empty taint-set", () => {
    const els = [{ value: "keep" }] as unknown as InteractiveElement[];
    expect(redactElements(els, new Set())[0]?.value).toBe("keep");
  });
});
