/**
 * `inspect` subcommand handler: capture the snapshot (which tags elements with
 * `data-fuse-ref`) then report computed style + box + WCAG contrast for the
 * `--ref` element. Prints `{url, ref, style}` JSON.
 * @module bin/inspect-cli
 */
import type { Page } from "playwright";
import { captureSnapshot } from "../extraction/snapshot.js";
import { inspectStyle } from "../extraction/style-probe.js";
import { withCliPage } from "./cli-page.js";

type Values = Record<string, unknown>;

/** Snapshot then inspect the element identified by `ref`. */
async function snapshotAndInspect(page: Page, ref: string): Promise<Record<string, unknown>> {
  await captureSnapshot(page);
  const style = await inspectStyle(page, ref);
  return { url: page.url(), ref, style };
}

/** Run the `inspect` subcommand against `url`. */
export async function runInspectCli(url: string, values: Values): Promise<void> {
  const ref = typeof values.ref === "string" ? values.ref : undefined;
  if (!ref) {
    process.stderr.write("inspect: --ref <element-ref> is required (from snapshot)\n");
    process.exit(2);
  }
  const result = await withCliPage(url, values, (page) => snapshotAndInspect(page, ref));
  if (!result.style) {
    process.stdout.write(`${JSON.stringify({ ...result, error: "ref_not_found" }, null, 2)}\n`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
