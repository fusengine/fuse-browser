/**
 * Attach network and console listeners to a page.
 * @module agent/network
 */
import type { Page } from "playwright";

const DEFAULT_MAX_ENTRIES = 250;

/** Resolve the network-log cap from `FUSE_NETLOG_MAX` (falls back to 250). */
function resolveMax(): number {
  const raw = Number(process.env.FUSE_NETLOG_MAX);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX_ENTRIES;
}

/** Collected network and console entries (live, mutated by the listeners). */
export interface NetworkLog {
  network: Array<Record<string, unknown>>;
  console: Array<{ type: string; text: string }>;
}

/** True for the main-document request entry that must never be evicted. */
function isDocumentEntry(item: Record<string, unknown>): boolean {
  return item.type === "request" && item.resourceType === "document";
}

/**
 * Push with a FIFO cap. The first main-document request is pinned at index 0
 * and never evicted, so tools can still inspect the initial navigation even
 * after the buffer has cycled on request-heavy sites.
 */
function pushCapped(arr: Array<Record<string, unknown>>, item: Record<string, unknown>, max: number): void {
  arr.push(item);
  if (arr.length <= max) return;
  const pinned = arr.length > 0 && isDocumentEntry(arr[0] as Record<string, unknown>);
  arr.splice(pinned ? 1 : 0, 1);
}

/** Push a console entry with a plain FIFO cap. */
function pushConsole<T>(arr: T[], item: T, max: number): void {
  arr.push(item);
  if (arr.length > max) arr.shift();
}

/** Register request/response/console listeners and return their backing arrays. */
export function attachListeners(page: Page): NetworkLog {
  const max = resolveMax();
  const network: Array<Record<string, unknown>> = [];
  const consoleEntries: Array<{ type: string; text: string }> = [];
  page.on("request", (req) =>
    pushCapped(
      network,
      {
        type: "request",
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
      },
      max,
    ),
  );
  page.on("response", (res) => pushCapped(network, { type: "response", status: res.status(), url: res.url() }, max));
  page.on("console", (msg) => pushConsole(consoleEntries, { type: msg.type(), text: msg.text() }, max));
  return { network, console: consoleEntries };
}
