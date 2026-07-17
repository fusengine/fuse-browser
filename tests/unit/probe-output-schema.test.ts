import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { compactReport } from "../../src/agent/compact.js";
import type { ProbeReport } from "../../src/interfaces/report.js";
import { probeReportShape } from "../../src/server/tools/probe-output-schema.js";

/** The SDK's own runtime gate: throws if `structuredContent` violates `outputSchema`. */
const probeOutputSchema = z.object(probeReportShape);

/** A fully populated report — every optional feature turned on. */
function fullReport(): ProbeReport {
  return {
    url: "https://example.com",
    title: "Example",
    realtime: false,
    domChanged: false,
    text: "hello world",
    prices: [{ currency: "CHF", amount: 12.5, line: "CHF 12.50", lineNo: 3, context: "Tickets from" }],
    hotelOffers: {
      headline: { currency: "CHF", amount: 99 },
      options: [{ provider: "booking", currency: "CHF", amount: 99 }],
      bestTotal: { provider: "booking", currency: "CHF", amount: 99 },
    },
    challenges: { captcha: false, turnstile: false, hcaptcha: false, cloudflare: false, login: false, otp: false },
    captcha: { attempted: true, solved: true, kind: "recaptcha", provider: "2captcha" },
    serp: { organic: [{ position: 1, title: "t", url: "https://a.com" }], ads: [], related: [] },
    contacts: { emails: ["a@b.com"], phones: [], hasContactForm: true },
    fastPath: false,
    visual: { screenshotPath: "/tmp/x.png", viewport: { width: 1280, height: 800 }, interactiveElements: [] },
    consent: { handled: true, target: "#accept", strategy: "click" },
    currency: { countryCode: "CH", preferred: "CHF", detected: "CHF", handled: true },
    identity: {
      countryCode: "CH",
      locale: "fr-CH",
      timezoneId: "Europe/Zurich",
      currency: "CHF",
      geolocation: { latitude: 46.2, longitude: 6.1 },
      acceptLanguage: "fr-CH",
      realisticProfile: true,
      persistentProfile: false,
      userDataDir: null,
      proxyEnabled: false,
      proxyUrl: null,
      proxySource: null,
      proxyCountryCode: null,
      proxyRequiredForIpAlignment: false,
    },
    actions: [{ type: "click", ok: true, target: "#go", ms: 12 }],
    replay: { enabled: true, steps: [], dir: "/tmp/replay" },
    siteMemory: { enabled: true, updated: true, filePath: "/tmp/memory.json" },
    network: [],
    console: [],
    screenshotPath: "/tmp/x.png",
    reportPath: "/tmp/report.json",
    storageStatePath: null,
  };
}

describe("probe outputSchema", () => {
  test("compactReport() of a fully populated report parses without throwing", () => {
    const compact = compactReport(fullReport());
    expect(() => probeOutputSchema.parse(compact)).not.toThrow();
  });

  test("compactReport() with the {} empty variants (hotelOffers/challenges/visual) also parses", () => {
    const report = fullReport();
    report.hotelOffers = {};
    report.challenges = {};
    report.visual = {};
    report.captcha = undefined;
    report.serp = undefined;
    report.contacts = undefined;
    const compact = compactReport(report);
    expect(() => probeOutputSchema.parse(compact)).not.toThrow();
  });
});
