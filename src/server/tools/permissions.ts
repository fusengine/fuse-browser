/**
 * `browser_permissions`: grant or clear runtime browser permissions
 * (geolocation, clipboard-read/write, notifications, camera, microphone…)
 * on a live session, optionally scoped to a single origin.
 * @module server/tools/permissions
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrowserContext } from "playwright";
import { z } from "zod";
import type { SessionManager } from "../../session/manager.js";
import { jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** grant adds permissions; clear removes every granted permission. */
export type PermissionAction = "grant" | "clear";

const DESC =
  "Grant or clear runtime permissions on this session. `grant` (default) allows the listed " +
  "permissions (e.g. geolocation, notifications, clipboard-read, clipboard-write, camera, " +
  "microphone), optionally scoped to `origin`. `clear` revokes all previously granted permissions.";

/**
 * Apply a permission change to a context.
 * @param context - The session browser context.
 * @param action - grant or clear.
 * @param permissions - Permission names to grant (ignored on clear).
 * @param origin - Optional origin to scope a grant to.
 */
export async function applyPermissions(
  context: BrowserContext,
  action: PermissionAction,
  permissions: string[],
  origin?: string,
): Promise<void> {
  if (action === "clear") return context.clearPermissions();
  return context.grantPermissions(permissions, origin ? { origin } : undefined);
}

/** Merged success shape across the 2 actions (grant/clear). */
export const PERMISSIONS_OUTPUT_SHAPE = {
  cleared: z.literal(true).optional(),
  granted: z.array(z.string()).optional(),
  origin: z.string().optional(),
};

/** Register `browser_permissions`. */
export function registerPermissionsTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_permissions",
    {
      title: "Grant or clear permissions",
      description: DESC,
      inputSchema: {
        sessionId: z.string(),
        permissions: z.array(z.string()).default([]),
        origin: z.string().optional(),
        action: z.enum(["grant", "clear"]).default("grant"),
      },
      outputSchema: PERMISSIONS_OUTPUT_SHAPE,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const action = (a.action as PermissionAction) ?? "grant";
        const permissions = (a.permissions as string[]) ?? [];
        const origin = a.origin as string | undefined;
        await applyPermissions(s.context, action, permissions, origin);
        return action === "clear"
          ? jsonResult({ cleared: true })
          : jsonResult({ granted: permissions, origin });
      });
    },
  );
}
