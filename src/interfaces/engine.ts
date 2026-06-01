/**
 * Browser engine contract: abstracts the low-level driver (Playwright,
 * Patchright, or a CDP attachment) from the intelligence layer
 * (actions, extraction, agent, server).
 * @module interfaces/engine
 */
import type { Browser, BrowserContext, Page } from "playwright";
import type { ResolvedConfig } from "../agent/config.js";
import type { EngineId } from "./engine-types.js";

/**
 * An opened context plus its owning browser.
 * `browser` is null for persistent contexts. When `connected` is true the
 * context belongs to a user's already-running browser (CDP attach): it must
 * NOT be closed on teardown — only the CDP link is dropped.
 */
export interface OpenedContext {
  context: BrowserContext;
  browser: Browser | null;
  connected?: boolean;
  /** Pre-existing page to reuse (CDP attach), if any. */
  page?: Page;
}

/** A swappable browser engine that knows how to open a ready context. */
export interface BrowserEngine {
  /** Stable engine identifier. */
  readonly name: EngineId;
  /** Launch or attach the engine and open a context configured from `config`. */
  open(config: ResolvedConfig): Promise<OpenedContext>;
}
