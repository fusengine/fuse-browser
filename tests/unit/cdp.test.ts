import { describe, expect, test } from "bun:test";
import { resolveConfig } from "../../src/agent/config.js";
import { assertCdpEndpoint, isRemoteCdp } from "../../src/engine/cdp-url.js";
import { localeLanguages, stealthInitScript } from "../../src/engine/stealth-init.js";

const OUT = "/tmp/fuse-cdp-test";

describe("isRemoteCdp", () => {
  test("ws/wss are remote, http(s) are local", () => {
    expect(isRemoteCdp("wss://host/browserless?token=t")).toBe(true);
    expect(isRemoteCdp("ws://host:3000")).toBe(true);
    expect(isRemoteCdp("http://localhost:9222")).toBe(false);
    expect(isRemoteCdp("https://localhost:9222")).toBe(false);
  });
});

describe("assertCdpEndpoint", () => {
  test("accepts http/https/ws/wss", () => {
    expect(() => assertCdpEndpoint("http://localhost:9222")).not.toThrow();
    expect(() => assertCdpEndpoint("wss://host/path")).not.toThrow();
  });
  test("rejects other / missing protocols", () => {
    expect(() => assertCdpEndpoint("tcp://x")).toThrow();
    expect(() => assertCdpEndpoint("localhost:9222")).toThrow();
  });
});

describe("stealth-init", () => {
  test("localeLanguages derives the base language", () => {
    expect(localeLanguages("fr-FR")).toEqual(["fr-FR", "fr"]);
    expect(localeLanguages("en")).toEqual(["en"]);
  });
  test("script masks webdriver and sets navigator.languages", () => {
    const s = stealthInitScript(["fr-FR", "fr"]);
    expect(s).toContain("webdriver");
    expect(s).toContain('["fr-FR","fr"]');
  });
});

describe("resolveConfig — CDP remote semantics", () => {
  test("cdpCloseOnDone defaults true for remote ws/wss", () => {
    expect(resolveConfig({ cdpEndpoint: "wss://h/p", outputDir: OUT }).cdpCloseOnDone).toBe(true);
  });
  test("cdpCloseOnDone defaults false for local http", () => {
    expect(resolveConfig({ cdpEndpoint: "http://localhost:9222", outputDir: OUT }).cdpCloseOnDone).toBe(false);
  });
  test("explicit cdpCloseOnDone wins over the default", () => {
    const c = resolveConfig({ cdpEndpoint: "wss://h/p", cdpCloseOnDone: false, outputDir: OUT });
    expect(c.cdpCloseOnDone).toBe(false);
  });
  test("headers and timeout resolve onto the config", () => {
    const c = resolveConfig({ cdpEndpoint: "wss://h/p", cdpHeaders: { Authorization: "Bearer x" }, outputDir: OUT });
    expect(c.cdpHeaders).toEqual({ Authorization: "Bearer x" });
    expect(c.cdpTimeoutMs).toBe(20_000);
  });
});
