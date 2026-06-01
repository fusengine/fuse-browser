import { describe, expect, test } from "bun:test";
import { buildIdentity, redactProxyUrl } from "../../src/identity/identity.js";
import { resolveIdentity } from "../../src/identity/resolve.js";
import { loadProxyCountryMap, resolveProxy } from "../../src/proxy/country-map.js";

describe("resolveIdentity", () => {
  test("defaults to Swiss identity", () => {
    const id = resolveIdentity({});
    expect(id.countryCode).toBe("CH");
    expect(id.locale).toBe("fr-CH");
    expect(id.timezoneId).toBe("Europe/Zurich");
    expect(id.currency).toBe("CHF");
  });

  test("country drives locale/currency/timezone", () => {
    expect(resolveIdentity({ countryCode: "US" })).toMatchObject({
      locale: "en-US",
      currency: "USD",
      timezoneId: "America/New_York",
    });
    expect(resolveIdentity({ countryCode: "GB" })).toMatchObject({
      locale: "en-GB",
      currency: "GBP",
      timezoneId: "Europe/London",
    });
  });

  test("covers major markets", () => {
    const cases: Record<string, [string, string, string]> = {
      DE: ["de-DE", "EUR", "Europe/Berlin"],
      IT: ["it-IT", "EUR", "Europe/Rome"],
      ES: ["es-ES", "EUR", "Europe/Madrid"],
      CA: ["en-CA", "CAD", "America/Toronto"],
      AU: ["en-AU", "AUD", "Australia/Sydney"],
      JP: ["ja-JP", "JPY", "Asia/Tokyo"],
      AE: ["en-AE", "AED", "Asia/Dubai"],
      BR: ["pt-BR", "BRL", "America/Sao_Paulo"],
    };
    for (const [country, [locale, currency, tz]] of Object.entries(cases)) {
      const id = resolveIdentity({ countryCode: country });
      expect([id.locale, id.currency, id.timezoneId]).toEqual([locale, currency, tz]);
    }
  });
});

describe("redactProxyUrl", () => {
  test("masks credentials", () => {
    expect(redactProxyUrl("http://user:pass@host:8080")).toBe("http://***:***@host:8080");
    expect(redactProxyUrl("http://host:8080")).toBe("http://host:8080");
    expect(redactProxyUrl(null)).toBeNull();
  });
});

describe("proxy country map", () => {
  test("loads inline map", () => {
    expect(loadProxyCountryMap({ jp: "http://jp:8080" })).toEqual({ JP: "http://jp:8080" });
  });

  test("explicit wins over map, map selects by country", () => {
    expect(resolveProxy("http://x:1", "CH", { CH: "http://map:1" })).toEqual({
      proxyUrl: "http://x:1",
      proxySource: "explicit",
    });
    expect(resolveProxy(undefined, "JP", { JP: "http://jp:8080" })).toEqual({
      proxyUrl: "http://jp:8080",
      proxySource: "country_map",
    });
    expect(resolveProxy(undefined, "FR", {})).toEqual({ proxyUrl: null, proxySource: null });
  });
});

describe("buildIdentity", () => {
  test("reports persistent profile and proxy source", () => {
    const id = buildIdentity({
      identity: resolveIdentity({ countryCode: "JP" }),
      realisticProfile: true,
      userDataDir: "/tmp/profile",
      proxyUrl: "http://jp-proxy.example:8080",
      proxySource: "country_map",
    });
    expect(id.persistentProfile).toBe(true);
    expect(id.proxyEnabled).toBe(true);
    expect(id.proxyRequiredForIpAlignment).toBe(false);
    expect(id.proxyCountryCode).toBe("JP");
  });
});
