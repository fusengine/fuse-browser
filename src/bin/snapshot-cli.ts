/**
 * `snapshot` subcommand handler: capture the interactive-element snapshot of a
 * page (add `--selectors` for per-element CSS selectors). Prints
 * `{url, count, elements}` JSON.
 * @module bin/snapshot-cli
 */
import { captureSnapshot } from "../extraction/snapshot.js";
import { withCliPage } from "./cli-page.js";

type Values = Record<string, unknown>;

/** Run the `snapshot` subcommand against `url`. */
export async function runSnapshotCli(url: string, values: Values): Promise<void> {
  const withSelectors = Boolean(values.selectors);
  const elements = await withCliPage(url, values, (page) => captureSnapshot(page, withSelectors));
  process.stdout.write(`${JSON.stringify({ url, count: elements.length, elements }, null, 2)}\n`);
}
