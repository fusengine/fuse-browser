/**
 * `run` subcommand handler: execute a multi-step plan in one page session via
 * {@link runSteps}. Steps come from `--steps '<json>'` (inline) or
 * `--steps-file <path>` (`-` = stdin). Prints `{ok, url, steps}` JSON.
 * @module bin/run-cli
 */
import { readFileSync } from "node:fs";
import { type RunStep, runSteps } from "../agent/run-steps.js";
import { withCliPage } from "./cli-page.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Read the raw steps JSON from `--steps` or `--steps-file` (`-` = stdin). */
function readStepsSource(values: Values): string {
  const inline = str(values.steps);
  if (inline) return inline;
  const file = str(values["steps-file"]);
  if (!file) {
    process.stderr.write("run: provide --steps '<json>' or --steps-file <path>\n");
    process.exit(2);
  }
  return readFileSync(file === "-" ? 0 : file, "utf8");
}

/** Parse the steps JSON into an array, exiting 2 on malformed/non-array input. */
function parseSteps(values: Values): RunStep[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readStepsSource(values));
  } catch (err) {
    process.stderr.write(`run: malformed steps JSON: ${(err as Error).message}\n`);
    process.exit(2);
  }
  if (!Array.isArray(parsed)) {
    process.stderr.write("run: steps JSON must be an array\n");
    process.exit(2);
  }
  return parsed as RunStep[];
}

/** Run the `run` subcommand against `url`. */
export async function runRunCli(url: string, values: Values): Promise<void> {
  const steps = parseSteps(values);
  const humanMode = Boolean(values["human-mode"]);
  const results = await withCliPage(url, values, (page) => runSteps(page, steps, humanMode));
  const failed = results.find((r) => !r.ok);
  if (failed) {
    const error = { kind: "step_failed", step: failed.index, message: failed.error ?? "failed" };
    process.stdout.write(`${JSON.stringify({ ok: false, url, error, steps: results }, null, 2)}\n`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify({ ok: true, url, steps: results }, null, 2)}\n`);
}
