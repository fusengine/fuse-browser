/**
 * Server-wide browser defaults read from `FUSE_*` environment variables.
 * Each value is a fallback: an explicit per-tool-call argument always wins.
 * Lets a single MCP config pin a default engine / installed channel / CDP
 * endpoint without the agent repeating it on every call.
 * @module server/env-defaults
 */
import type { AgentOptions } from "../interfaces/types.js";

/** Map a boolean-ish env var to `boolean | undefined` (unset stays undefined). */
function envBool(value: string | undefined): boolean | undefined {
  return value ? value !== "false" : undefined;
}

/** Read `FUSE_*` env vars into partial agent options (undefined when unset). */
export function envAgentDefaults(env: NodeJS.ProcessEnv = process.env): Partial<AgentOptions> {
  return {
    engine: env.FUSE_ENGINE as AgentOptions["engine"],
    channel: env.FUSE_CHANNEL as AgentOptions["channel"],
    cdpEndpoint: env.FUSE_CDP_ENDPOINT,
    executablePath: env.FUSE_EXECUTABLE_PATH,
    headless: envBool(env.FUSE_HEADLESS),
    countryCode: env.FUSE_COUNTRY,
    currency: env.FUSE_CURRENCY,
    userDataDir: env.FUSE_USER_DATA_DIR,
    storageStatePath: env.FUSE_STORAGE_STATE,
    outputDir: env.FUSE_OUTPUT_DIR,
  };
}
