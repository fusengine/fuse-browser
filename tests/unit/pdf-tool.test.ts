import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { SessionManager } from "../../src/session/manager.js";
import type { SessionData } from "../../src/session/session.js";
import { registerPdfTool } from "../../src/server/tools/pdf.js";

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;

/** Capture the registered handler from a fake McpServer. */
function captureHandler(): { server: McpServer; handler: () => Handler } {
  let captured: Handler | undefined;
  const server = {
    registerTool: (_name: string, _cfg: unknown, fn: Handler) => {
      captured = fn;
    },
  } as unknown as McpServer;
  return { server, handler: () => captured as Handler };
}

/** Minimal session manager backed by one session whose page.pdf is `pdf`. */
function fakeSessions(pdf: SessionData["page"]["pdf"]): SessionManager {
  const session = { id: "s", health: "ok", page: { pdf } } as unknown as SessionData;
  return {
    get: () => session,
    markBusy: () => {},
    markIdle: () => {},
  } as unknown as SessionManager;
}

describe("browser_pdf", () => {
  test("no path -> returns base64 with the right options forwarded", async () => {
    let seen: unknown;
    const { server, handler } = captureHandler();
    registerPdfTool(
      server,
      fakeSessions((async (o: unknown) => {
        seen = o;
        return Buffer.from("%PDF-1.4 fake");
      }) as SessionData["page"]["pdf"]),
    );
    const res = await handler()({
      sessionId: "s",
      format: "A4",
      landscape: true,
      printBackground: true,
    });
    expect(seen).toEqual({ format: "A4", landscape: true, printBackground: true });
    const payload = res.structuredContent as Record<string, unknown>;
    expect(Buffer.from(payload.pdfBase64 as string, "base64").toString()).toBe("%PDF-1.4 fake");
  });

  test("with path -> writes the file and returns {path}", async () => {
    const out = join(tmpdir(), `fuse-pdf-${Date.now()}.pdf`);
    const { server, handler } = captureHandler();
    registerPdfTool(
      server,
      fakeSessions((async () => Buffer.from("ONDISK")) as SessionData["page"]["pdf"]),
    );
    const res = await handler()({ sessionId: "s", path: out });
    expect((res.structuredContent as Record<string, unknown>).path).toBe(out);
    expect(readFileSync(out, "utf-8")).toBe("ONDISK");
  });

  test("page.pdf throwing -> clear headless-only error", async () => {
    const { server, handler } = captureHandler();
    registerPdfTool(
      server,
      fakeSessions((async () => {
        throw new Error("PDF generation is only supported in headless mode");
      }) as SessionData["page"]["pdf"]),
    );
    const res = await handler()({ sessionId: "s" });
    expect(res.isError).toBe(true);
    expect((res.structuredContent as Record<string, unknown>).code).toBe("pdf_unsupported");
  });
});
