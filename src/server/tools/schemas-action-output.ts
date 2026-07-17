/**
 * Shared zod `outputSchema` piece for a single browser action result, reused
 * by the probe (actions/replay) and run tool outputs.
 * @module server/tools/schemas-action-output
 */
import { z } from "zod";

/**
 * A normalized action result (matches `interfaces/types.ts#ActionResult`).
 * `type`/`ok` are always present; extra per-action fields pass through
 * unvalidated via `catchall` since each action kind adds its own detail.
 */
export const actionResultSchema = z.object({ type: z.string(), ok: z.boolean() }).catchall(z.unknown());
