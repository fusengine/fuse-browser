/**
 * `shots` subcommand handler: responsive screenshots saved to disk.
 * @module bin/shots-cli
 */
import { resolveConfig } from "../agent/config.js";
import { captureShots } from "../agent/shots.js";
import type { ViewportInput } from "../engine/viewport.js";
import type { EngineName } from "../interfaces/engine-types.js";

type Values = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const PRESETS = ["mobile", "tablet", "desktop"];

/** Parse a `--viewports` CSV ("mobile,desktop,1280x720") into viewport inputs. */
function parseViewports(csv: string | undefined): ViewportInput[] {
  return (csv ?? "mobile,desktop")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p): ViewportInput => {
      if (PRESETS.includes(p)) return p as ViewportInput;
      const [w, h] = p.split("x").map(Number);
      return Number.isFinite(w) && Number.isFinite(h) ? { width: w as number, height: h as number } : "desktop";
    });
}

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
