/**
 * Routing for the one-shot page commands (`run`, `products`, `extract`,
 * `snapshot`, `screenshot`, `inspect`). Kept apart from `cli.ts` so the entry
 * point stays small and the existing batch routing is untouched.
 * @module bin/cli-page-routes
 */
import { runExtractCli } from "./extract-cli.js";
import { runInspectCli } from "./inspect-cli.js";
import { runProductsCli } from "./products-cli.js";
import { runRunCli } from "./run-cli.js";
import { runScreenshotCli } from "./screenshot-cli.js";
import { runSnapshotCli } from "./snapshot-cli.js";

type Values = Record<string, unknown>;

/** Handler for a one-shot page command: `(url, values) => Promise<void>`. */
type PageRunner = (url: string, values: Values) => Promise<void>;

const PAGE_COMMANDS: Record<string, PageRunner> = {
  run: runRunCli,
  products: runProductsCli,
  extract: runExtractCli,
  snapshot: runSnapshotCli,
  screenshot: runScreenshotCli,
  inspect: runInspectCli,
};

/**
 * Dispatch a one-shot page command if `command` matches and a URL is present.
 *
 * @param command - The subcommand token.
 * @param rest - Remaining positionals (`rest[0]` is the URL).
 * @param values - Parsed CLI flags.
 * @returns True when handled (caller should stop routing); false otherwise.
 */
export async function routePageCommand(command: string, rest: string[], values: Values): Promise<boolean> {
  const runner = PAGE_COMMANDS[command];
  if (!runner || !rest[0]) return false;
  await runner(rest[0], values);
  return true;
}
