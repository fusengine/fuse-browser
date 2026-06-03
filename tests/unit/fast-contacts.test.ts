import { describe, expect, test } from "bun:test";
import { contactsComplete } from "../../src/agent/fast-contacts.js";
import type { Contacts } from "../../src/interfaces/contacts.js";

const c = (emails: string[], phones: string[]): Contacts => ({ emails, phones, hasContactForm: false });

describe("contactsComplete — fast-path escalation gate (email AND phone)", () => {
  test("complete card: email + phone", () => {
    expect(contactsComplete(c(["a@b.ch"], ["+41791234567"]))).toBe(true);
  });
  test("email only → escalate", () => {
    expect(contactsComplete(c(["a@b.ch"], []))).toBe(false);
  });
  test("phone only → escalate", () => {
    expect(contactsComplete(c([], ["+41791234567"]))).toBe(false);
  });
  test("nothing → escalate", () => {
    expect(contactsComplete(c([], []))).toBe(false);
  });
});
