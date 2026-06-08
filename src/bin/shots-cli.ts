/**
 * `shots` subcommand handler: responsive screenshots saved to disk.
 * @module bin/shots-cli
 */
import { resolveConfig } from "../agent/config.js";
import { captureShots } from "../agent/shots.js";
import { parseViewports } from "../engine/viewport.js";
import type { EngineName } from "../interfaces/engine-types.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Run the `shots` subcommand against `url`. */
export async function runShots(url: string, values: Values): Promise<void> {
  const config = resolveConfig({
    engine: str(values.engine) as EngineName | undefined,
    countryCode: str(values.country),
    headless: !values.headed,
    outputDir: str(values["output-dir"]),
  });
  const settleMs = values["settle-ms"] ? Number(values["settle-ms"]) : undefined;
  const shots = await captureShots(config, url, parseViewports(str(values.viewports)), settleMs);
  process.stdout.write(`${JSON.stringify(shots, null, 2)}\n`);
}
