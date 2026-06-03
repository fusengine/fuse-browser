import { describe, expect, test } from "bun:test";
import { deobfuscate } from "../../src/extraction/contacts/email.js";
import { extractContacts } from "../../src/extraction/contacts/extract.js";
import type { ContactSignals } from "../../src/interfaces/contacts.js";

const sig = (o: Partial<ContactSignals>): ContactSignals => ({
  html: "",
  text: "",
  mailto: [],
  tel: [],
  hasForm: false,
  ...o,
});

describe("extractContacts — emails (live cases)", () => {
  test("mailto-only home: email present only in the href", () => {
    const c = extractContacts(sig({ mailto: ["mailto:info@example.com?subject=Hi"] }), "CH");
    expect(c.emails).toContain("info@example.com");
  });
  test("plain text on a separate contact page", () => {
    const c = extractContacts(sig({ text: "Écrivez à contact@example.com svp." }), "CH");
    expect(c.emails).toContain("contact@example.com");
  });
  test("obfuscated email (at/dot words + HTML entities)", () => {
    const c = extractContacts(sig({ text: "jean [at] example [dot] org / bob&#64;example&#46;org" }), "CH");
    expect(c.emails).toContain("jean@example.org");
    expect(c.emails).toContain("bob@example.org");
  });
  test("ignores asset-like false positives", () => {
    const c = extractContacts(sig({ html: '<img src="sprite@2x.png">', text: "logo@2x.webp" }), "CH");
    expect(c.emails).toEqual([]);
  });
  test("bare 'x at y dot z' is decoded only with a real dot-span", () => {
    expect(extractContacts(sig({ text: "jean at example dot org" }), "CH").emails).toContain("jean@example.org");
  });
  test("prose ' at ' is NOT turned into a fake email", () => {
    const c = extractContacts(sig({ text: "Visit us at shop.example.org today" }), "CH");
    expect(c.emails).toEqual([]);
  });
});

describe("extractContacts — phones (E.164)", () => {
  test("tel: href normalized to E.164", () => {
    const c = extractContacts(sig({ tel: ["tel:+41 22 700 00 00"] }), "CH");
    expect(c.phones).toContain("+41227000000");
  });
  test("phone in clear text uses the default country", () => {
    const c = extractContacts(sig({ text: "Appelez le 079 123 45 67 pour un essai." }), "CH");
    expect(c.phones).toContain("+41791234567");
  });
});

describe("extractContacts — form + deobfuscate", () => {
  test("hasContactForm passes through", () => {
    expect(extractContacts(sig({ hasForm: true }), "CH").hasContactForm).toBe(true);
  });
  test("deobfuscate normalizes at/dot and entities", () => {
    expect(deobfuscate("a [at] b [dot] ch")).toBe("a@b.ch");
    expect(deobfuscate("x&#64;y&#46;ch")).toBe("x@y.ch");
  });
});
