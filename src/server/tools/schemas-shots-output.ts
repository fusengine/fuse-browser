/**
 * Shared zod `outputSchema` piece for a saved responsive screenshot, reused
 * by the shots-batch and site-shots tool outputs.
 * @module server/tools/schemas-shots-output
 */
import { z } from "zod";

/** One saved screenshot (matches `agent/shots.ts#Shot`). */
export const shotSchema = z.object({
  viewport: z.string(),
  width: z.number(),
  height: z.number(),
  path: z.string(),
  scrollJacked: z.boolean().optional(),
  frame: z.number().optional(),
});
