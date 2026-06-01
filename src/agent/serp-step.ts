/**
 * SERP extraction step for a probe: paginate the results, then optionally rank
 * a target domain. No-op (undefined) unless `extractSerp` is set.
 * @module agent/serp-step
 */
import type { Page } from "playwright";
import { findDomainRanks } from "../extraction/serp-rank.js";
import type { Serp } from "../interfaces/extraction.js";
import type { ProbeOptions } from "../interfaces/types.js";
import type { ResolvedConfig } from "./config.js";
import { collectSerp } from "./serp-paged.js";

/** Collect the SERP when opted-in, attaching `rank` when `rankDomain` is set. */
export async function extractSerpStep(
  page: Page,
  options: ProbeOptions,
  config: ResolvedConfig,
): Promise<Serp | undefined> {
  if (!options.extractSerp) return undefined;
  const serp = await collectSerp(page, options.serpPages ?? 1, config.retry);
  if (options.rankDomain) serp.rank = findDomainRanks(serp, options.rankDomain);
  return serp;
}
