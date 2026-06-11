/**
 * Resource-type blocking on a browser context: abort requests whose Playwright
 * `resourceType()` is in the blocked set, let everything else fall through to
 * the next route handler (HAR replay, etc.). Speeds up batch runs by skipping
 * images/fonts/media that extraction never reads.
 * @module net/block
 */
import type { BrowserContext } from "playwright";

/** Playwright resource types that can be blocked. Unknown inputs are ignored. */
export const BLOCKABLE_RESOURCE_TYPES = new Set([
  "image",
  "media",
  "font",
  "stylesheet",
  "script",
  "xhr",
  "fetch",
  "websocket",
  "manifest",
  "other",
]);

/**
 * Install a catch-all route that aborts blocked resource types.
 * Unknown type names are silently dropped; if nothing valid remains,
 * no route is installed at all (zero overhead).
 *
 * @param context - Context to intercept (route is context-wide).
 * @param types - Resource types to block (case-insensitive).
 */
export async function applyResourceBlocking(context: BrowserContext, types: string[]): Promise<void> {
  const blocked = new Set(types.map((t) => t.toLowerCase()).filter((t) => BLOCKABLE_RESOURCE_TYPES.has(t)));
  if (blocked.size === 0) return;
  await context.route("**/*", (route) =>
    blocked.has(route.request().resourceType()) ? route.abort() : route.fallback(),
  );
}
