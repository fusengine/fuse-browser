/**
 * `screenshot` subcommand handler: capture a PNG of a page. Writes to
 * `--output <file>` (printing the path) or emits base64 JSON on stdout. Add
 * `--full-page` for a full-page capture.
 * @module bin/screenshot-cli
 */
import { withCliPage } from "./cli-page.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `screenshot` subcommand against `url`. */
export async function runScreenshotCli(url: string, values: Values): Promise<void> {
  const fullPage = Boolean(values["full-page"]);
  const output = str(values.output);
  const buffer = await withCliPage(url, values, (page) =>
    page.screenshot({ fullPage, ...(output ? { path: output } : {}) }),
  );
  if (output) {
    process.stdout.write(`${JSON.stringify({ url, path: output, bytes: buffer.length }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify({ url, base64: buffer.toString("base64") }, null, 2)}\n`);
}
