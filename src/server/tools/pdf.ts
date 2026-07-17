/**
 * `browser_pdf`: render the live page to PDF. Chromium-headless only — Playwright
 * `page.pdf()` throws in headed mode or on non-chromium engines; we surface a
 * clear error in that case. With `path` the PDF is written to disk; otherwise it
 * is returned base64-encoded.
 * @module server/tools/pdf
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Page } from "playwright";
import { z } from "zod";
import { writeFileBytes } from "../../lib/fs.js";
import type { SessionManager } from "../../session/manager.js";
import { errorResult, jsonResult } from "../result.js";
import { withSession } from "./with-session.js";

const HEADLESS_ONLY = "browser_pdf requires headless chromium";

/** Options forwarded to Playwright `page.pdf()`. */
interface PdfOptions {
  format?: string;
  landscape?: boolean;
  printBackground?: boolean;
}

/** Render `page` to PDF; returns the bytes (no path, so Playwright yields a Buffer). */
async function renderPdf(page: Page, opts: PdfOptions): Promise<Buffer> {
  return page.pdf({
    format: opts.format,
    landscape: opts.landscape,
    printBackground: opts.printBackground,
  });
}

/** Merged success shape: `path` branch (on-disk) or `pdfBase64` branch (inline). */
export const PDF_OUTPUT_SHAPE = {
  path: z.string().optional(),
  pdfBase64: z.string().optional(),
  bytes: z.number(),
};

/** Register `browser_pdf`. */
export function registerPdfTool(server: McpServer, sessions: SessionManager): void {
  server.registerTool(
    "browser_pdf",
    {
      title: "Render PDF",
      description:
        "Render the live page to PDF (headless chromium only). With `path` the file is written and {path} returned; otherwise the PDF is returned base64 as {pdfBase64}.",
      inputSchema: {
        sessionId: z.string(),
        path: z.string().optional(),
        format: z.string().optional(),
        landscape: z.boolean().optional(),
        printBackground: z.boolean().optional(),
      },
      outputSchema: PDF_OUTPUT_SHAPE,
    },
    async (args) => {
      const a = args as Record<string, unknown>;
      return withSession(sessions, String(a.sessionId), async (s) => {
        const opts: PdfOptions = {
          format: a.format as string | undefined,
          landscape: a.landscape as boolean | undefined,
          printBackground: a.printBackground as boolean | undefined,
        };
        let bytes: Buffer;
        try {
          bytes = await renderPdf(s.page, opts);
        } catch {
          return errorResult(HEADLESS_ONLY, "pdf_unsupported");
        }
        if (typeof a.path === "string" && a.path.length > 0) {
          writeFileBytes(a.path, bytes);
          return jsonResult({ path: a.path, bytes: bytes.length });
        }
        return jsonResult({ pdfBase64: bytes.toString("base64"), bytes: bytes.length });
      });
    },
  );
}
