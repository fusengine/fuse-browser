/**
 * Tool capability groups: opt-in filtering of which MCP tool groups are
 * registered, via the `FUSE_CAPS` env var (comma-separated). Fewer exposed
 * tools = a lighter context for the LLM client. Default: all groups.
 * @module server/caps
 */

/** Every tool capability group, in registration order. */
export const CAP_GROUPS = ["core", "batch", "extract", "debug", "live"] as const;

/** A single capability group name. */
export type CapGroup = (typeof CAP_GROUPS)[number];

/**
 * Parse a `FUSE_CAPS` value (e.g. `"core,extract"`) into the set of enabled
 * groups. Blank/undefined enables everything; unknown names are reported on
 * stderr (stdout is reserved for JSON-RPC) and ignored. An input with only
 * unknown names falls back to all groups rather than an empty server.
 *
 * @param raw - The raw env value (comma-separated group names).
 * @returns The set of enabled capability groups.
 */
export function parseCaps(raw: string | undefined): Set<CapGroup> {
  const all = new Set<CapGroup>(CAP_GROUPS);
  const names = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (names.length === 0) return all;
  const enabled = new Set<CapGroup>();
  for (const name of names) {
    if ((CAP_GROUPS as readonly string[]).includes(name)) enabled.add(name as CapGroup);
    else console.error(`fuse-browser: unknown FUSE_CAPS group "${name}" (known: ${CAP_GROUPS.join(", ")})`);
  }
  return enabled.size > 0 ? enabled : all;
}
