/**
 * `browser_dialog` + `browser_downloads`: native dialog policy for a live
 * session and the list of downloads captured on it.
 * @module server/tools/dialogs
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { attachDialogs, recentDialogs, setDialogPolicy } from "../../session/dialogs.js";
import { readDownload } from "../../session/download-read.js";
import { attachDownloads, listDownloads } from "../../session/downloads.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

/** Register `browser_dialog` and `browser_downloads`. */
export function registerDialogTools(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_dialog",
    {
      title: "Set dialog policy",
      description:
        "Set how native dialogs (alert/confirm/prompt/beforeunload) are handled on this session: accept or dismiss, with optional text for prompts. Applies to upcoming dialogs; also returns the recent ones.",
      inputSchema: {
        sessionId: z.string(),
        action: z.enum(["accept", "dismiss"]),
        promptText: z.string().optional(),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        // Idempotent: a no-op when the session wiring already attached it.
        attachDialogs(s);
        const policy = {
          action: a.action as "accept" | "dismiss",
          promptText: a.promptText as string | undefined,
        };
        setDialogPolicy(s, policy);
        return jsonResult({ policy, recent: recentDialogs(s) });
      });
    },
  );

  server.registerTool(
    "browser_downloads",
    {
      title: "List downloads",
      description:
        "List the files downloaded by this session (saved under outputDir/downloads). Pass `read` (index or filename) to also return one file's content, decoded as `encoding` (utf8 or base64).",
      inputSchema: {
        sessionId: z.string(),
        read: z.union([z.number(), z.string()]).optional(),
        encoding: z.enum(["utf8", "base64"]).default("utf8"),
      },
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        // Idempotent: a no-op when the session wiring already attached it.
        attachDownloads(s);
        const downloads = listDownloads(s);
        const base = { count: downloads.length, downloads };
        if (a.read === undefined) return jsonResult(base);
        const encoding = a.encoding as "utf8" | "base64";
        const content = readDownload(downloads, a.read as number | string, encoding);
        if ("error" in content) return errorResult(content.error, "DOWNLOAD_READ_FAILED");
        return jsonResult({ ...base, content });
      });
    },
  );
}
