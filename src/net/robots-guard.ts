/**
 * Opt-in robots.txt guard: fetch /robots.txt per origin (cached) and answer
 * whether a URL may be visited. Only used when `respectRobots` is enabled.
 * Fetch/parse failures fail OPEN (allow) — this is a neutral, opt-in lever.
 * @module net/robots-guard
 */
import { RobotsDisallowed } from "../lib/errors.js";
import { fetchFast } from "./fetch-fast.js";
import { parseRobots, type RobotsMatcher } from "./robots.js";

/** Resolves whether URLs are crawlable under their origin's robots.txt. */
export interface RobotsGuard {
  allowed(url: string): Promise<boolean>;
}

/** Product token used to select a robots group (falls back to `*`). */
const USER_AGENT = "fuse-browser";

/** Create a per-run guard with a per-origin robots.txt cache. */
export function createRobotsGuard(proxyUrl?: string | null): RobotsGuard {
  const cache = new Map<string, RobotsMatcher | null>();
  return {
    async allowed(url: string): Promise<boolean> {
      let origin: string;
      try {
        origin = new URL(url).origin;
      } catch {
        return true;
      }
      if (!cache.has(origin)) {
        try {
          const r = await fetchFast(`${origin}/robots.txt`, proxyUrl ?? undefined);
          cache.set(origin, r.status >= 200 && r.status < 400 ? parseRobots(r.html) : null);
        } catch {
          cache.set(origin, null);
        }
      }
      const matcher = cache.get(origin) ?? null;
      return matcher ? matcher.isAllowed(url, USER_AGENT) : true;
    },
  };
}

/** When `respectRobots` is on, build a guard and assert the target is crawlable. */
export async function assertRobotsAllowed(
  config: { respectRobots: boolean; proxyUrl: string | null },
  url: string,
): Promise<RobotsGuard | null> {
  if (!config.respectRobots) return null;
  const guard = createRobotsGuard(config.proxyUrl);
  if (!(await guard.allowed(url))) throw new RobotsDisallowed(url);
  return guard;
}
