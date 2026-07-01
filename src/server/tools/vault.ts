/**
 * `browser_vault`: read-only discovery of stored credentials. Returns only
 * non-secret metadata (ref, username, hasTotp, origins) — never a password or
 * TOTP. Writing is CLI-only (`fuse-browser vault set`), by design: secrets
 * must never travel through an MCP argument.
 * @module server/tools/vault
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionManager } from "../../session/manager.js";
import { originAllowed } from "../../vault/resolve.js";
import { listEntries, loadVault } from "../../vault/store.js";
import { errorResult, jsonResult } from "../result.js";

/** Register `browser_vault` (list-only, metadata-only). */
export function registerVaultTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_vault",
    {
      title: "Vault",
      description:
        "List stored credential references — metadata only, NEVER secrets. Returns {credentials:[{ref, username, hasTotp, origins}]}. Pass `sessionId` to only show credentials bound to the live page's origin (use before a browser_login / browser_fill `credentialRef`). Writing is CLI-only: `fuse-browser vault set <ref>`.",
      inputSchema: {
        action: z.literal("list"),
        sessionId: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      try {
        const all = listEntries(loadVault());
        const sid = a.sessionId;
        if (typeof sid !== "string" || !sid) return jsonResult({ credentials: all });
        const url = sessions.get(sid).page.url();
        return jsonResult({ credentials: all.filter((c) => originAllowed(c.origins, url)) });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err), "vault_failed");
      }
    },
  );
}
