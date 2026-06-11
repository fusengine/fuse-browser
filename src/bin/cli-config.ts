/**
 * Map raw CLI flags (`parseArgs` values) into {@link AgentOptions} for the
 * one-shot page commands (`run`, `products`, `extract`, `snapshot`,
 * `screenshot`, `inspect`). Mirrors the flag→option conventions of the existing
 * runners (probe-cli, shots-cli): `--headed` flips `headless` off, `--country`
 * feeds `countryCode`, `--no-robots` disables robots, etc.
 * @module bin/cli-config
 */
import type { EngineName } from "../interfaces/engine-types.js";
import type { AgentOptions } from "../interfaces/types.js";

type Values = Record<string, unknown>;

/** Narrow an unknown flag value to a string (or undefined when absent/non-string). */
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/**
 * Build {@link AgentOptions} from parsed CLI `values`.
 *
 * @param values - The `parseArgs` `values` object for the current invocation.
 * @returns Agent options consumable by `resolveConfig`.
 */
export function cliAgentOptions(values: Values): AgentOptions {
  const blockRaw = str(values["block-resources"]);
  const blockResources = blockRaw
    ? blockRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  return {
    engine: str(values.engine) as EngineName | undefined,
    countryCode: str(values.country),
    currency: str(values.currency),
    headless: !values.headed,
    humanMode: Boolean(values["human-mode"]),
    proxyUrl: str(values.proxy),
    proxyMapPath: str(values["proxy-map"]),
    outputDir: str(values["output-dir"]),
    storageStatePath: str(values["storage-state"]),
    respectRobots: values["no-robots"] ? false : undefined,
    ...(blockResources ? { blockResources } : {}),
  };
}
