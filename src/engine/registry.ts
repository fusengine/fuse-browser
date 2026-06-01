/**
 * Engine registry: choose the browser engine for a resolved config.
 * A `cdpEndpoint` forces the CDP attach engine regardless of `engine`.
 * @module engine/registry
 */
import type { ResolvedConfig } from "../agent/config.js";
import type { BrowserEngine } from "../interfaces/engine.js";
import type { EngineName } from "../interfaces/types.js";
import { cdpEngine } from "./cdp-engine.js";
import { patchrightEngine } from "./patchright-engine.js";
import { playwrightEngine } from "./playwright-engine.js";

const ENGINES: Record<EngineName, BrowserEngine> = {
  playwright: playwrightEngine,
  patchright: patchrightEngine,
};

/** Select the launch engine for `name`, defaulting to Patchright (stealth). */
export function selectEngine(name: EngineName): BrowserEngine {
  return ENGINES[name] ?? patchrightEngine;
}

/** Select the engine for a config: CDP attach if `cdpEndpoint`, else launch. */
export function selectEngineForConfig(config: ResolvedConfig): BrowserEngine {
  return config.cdpEndpoint ? cdpEngine : selectEngine(config.engine);
}
