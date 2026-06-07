/**
 * Metadata-flag handling shared by both bin entry points. Resolves `--help`/`-h`
 * and `--version`/`-v` *before* strict arg parsing (or, for the MCP bin, before
 * the stdio transport binds), so these never trip `parseArgs` validation or
 * corrupt the protocol stream. Exits the process on a match.
 * @module bin/cli-meta
 */
import { parseArgs } from "node:util";
import { VERSION } from "../lib/version.js";

/**
 * Print `usage` on `--help`/`-h`, or {@link VERSION} on `--version`/`-v`, then
 * exit(0). No-op when neither flag is present.
 *
 * @param args - Raw CLI args (`process.argv.slice(2)`).
 * @param usage - Usage string to print for `--help`.
 */
export function handleMetaFlags(args: readonly string[], usage: string): void {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(usage);
    process.exit(0);
  }
  if (args.includes("--version") || args.includes("-v")) {
    process.stdout.write(`${VERSION}\n`);
    process.exit(0);
  }
}

/**
 * Run `parseArgs`, but turn an unknown-option error into a concise stderr line +
 * exit(1) instead of a Node `ERR_PARSE_ARGS_UNKNOWN_OPTION` stack trace.
 *
 * @param config - The `parseArgs` configuration (must set `args`).
 * @returns The parsed result.
 */
export function parseArgsOrExit(config: Parameters<typeof parseArgs>[0]): ReturnType<typeof parseArgs> {
  try {
    return parseArgs(config);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
      process.stderr.write(`error: ${String(e.message).replace(/\. To specify[\s\S]*$/, "")}\n`);
      process.exit(1);
    }
    throw err;
  }
}

/** First token starting with `-` (an unknown flag) in `args`, or undefined. */
export function firstFlag(args: readonly string[]): string | undefined {
  return args.find((a) => a.startsWith("-"));
}
