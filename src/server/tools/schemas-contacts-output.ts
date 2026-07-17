/**
 * Shared zod `outputSchema` piece for extracted page contacts, reused by the
 * probe and fetch tool outputs.
 * @module server/tools/schemas-contacts-output
 */
import { z } from "zod";

/** Matches `interfaces/contacts.ts#Contacts`. */
export const contactsSchema = z.object({
  emails: z.array(z.string()),
  phones: z.array(z.string()),
  hasContactForm: z.boolean(),
});
