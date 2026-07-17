/**
 * `browser_console` / `browser_network` output schemas — split out of
 * `logs.ts` to keep it under the 100-line SOLID limit.
 * @module server/tools/logs-output
 */
import { z } from "zod";

/** One console entry (Playwright message type + text). */
const CONSOLE_ENTRY_SHAPE = z.object({ type: z.string(), text: z.string() });

/** Shape of the `browser_console` success payload. */
export const CONSOLE_OUTPUT_SHAPE = {
  count: z.number(),
  entries: z.array(CONSOLE_ENTRY_SHAPE),
};

/** One merged network row (mirrors `NetworkEntry` from `logs-filter.ts`). */
const NETWORK_ENTRY_SHAPE = z.object({
  method: z.string().optional(),
  url: z.string(),
  status: z.number().optional(),
  resourceType: z.string().optional(),
});

/** Shape of the `browser_network` success payload. */
export const NETWORK_OUTPUT_SHAPE = {
  count: z.number(),
  requests: z.array(NETWORK_ENTRY_SHAPE),
};
