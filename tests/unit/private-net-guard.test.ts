import { afterEach, describe, expect, test } from "bun:test";
import {
  assertNetworkAllowed,
  isPrivateIp,
  PrivateNetworkBlockedError,
} from "../../src/net/private-net-guard.js";

// AJOUT 2 regression coverage: FUSE_BLOCK_PRIVATE_NETS, opt-out, byte-identical off.
// The IPv6/mapped/CGNAT bypass matrix and encoded-form regressions live in
// private-net-guard-bypass.test.ts (kept split to stay under the 100-line limit).
const ORIGINAL = process.env.FUSE_BLOCK_PRIVATE_NETS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FUSE_BLOCK_PRIVATE_NETS;
  else process.env.FUSE_BLOCK_PRIVATE_NETS = ORIGINAL;
});

describe("isPrivateIp", () => {
  test("v4 loopback/private/link-local ranges", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.5")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("169.254.1.1")).toBe(true);
  });
  test("v4 new ranges: 0.0.0.0/8, 100.64.0.0/10 (CGNAT), 192.0.0.0/24", () => {
    expect(isPrivateIp("0.0.0.0")).toBe(true);
    expect(isPrivateIp("0.1.2.3")).toBe(true);
    expect(isPrivateIp("100.64.0.1")).toBe(true);
    expect(isPrivateIp("100.127.255.255")).toBe(true);
    expect(isPrivateIp("100.63.255.255")).toBe(false); // just below the /10
    expect(isPrivateIp("100.128.0.0")).toBe(false); // just above the /10
    expect(isPrivateIp("192.0.0.1")).toBe(true);
  });
  test("v4 public addresses are not private", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("172.32.0.1")).toBe(false);
    expect(isPrivateIp("93.184.216.34")).toBe(false);
  });
  test("v6 loopback/link-local/unique-local/unspecified", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("::")).toBe(true);
  });
  test("v6 fe80::/10 link-local covers the full range, not just the fe80 literal", () => {
    expect(isPrivateIp("fe90::1")).toBe(true);
    expect(isPrivateIp("feb0::1")).toBe(true);
    expect(isPrivateIp("febf::1")).toBe(true); // top of the /10
    expect(isPrivateIp("fec0::1")).toBe(false); // just above /10 (deprecated site-local, not link-local)
    expect(isPrivateIp("ff02::1")).toBe(false); // multicast, out of range
  });
  test("IPv4-mapped IPv6 (dotted and hex forms) resolves to the embedded v4 range", () => {
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:7f00:1")).toBe(true);
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false);
  });
});

describe("assertNetworkAllowed — OFF by default (byte-identical dev workflow)", () => {
  test("loopback URL resolves without throwing when the env is unset", async () => {
    delete process.env.FUSE_BLOCK_PRIVATE_NETS;
    await expect(assertNetworkAllowed("http://127.0.0.1:3000")).resolves.toBeUndefined();
  });
});

describe("assertNetworkAllowed — ON (FUSE_BLOCK_PRIVATE_NETS=1)", () => {
  test("literal loopback IP host is blocked", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    await expect(assertNetworkAllowed("http://127.0.0.1:3000")).rejects.toThrow(PrivateNetworkBlockedError);
  });

  test("`localhost` hostname is blocked", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    await expect(assertNetworkAllowed("http://localhost:8080")).rejects.toThrow(PrivateNetworkBlockedError);
  });

  test("a hostname resolving (via injected DNS lookup) to a public IP passes", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    const fakeLookup = async () => ({ address: "93.184.216.34", family: 4 });
    await expect(assertNetworkAllowed("https://example.test", fakeLookup)).resolves.toBeUndefined();
  });

  test("a hostname resolving (via injected DNS lookup) to a private IP is blocked (DNS-rebinding case)", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    const fakeLookup = async () => ({ address: "10.0.0.5", family: 4 });
    await expect(assertNetworkAllowed("https://rebind.test", fakeLookup)).rejects.toThrow(PrivateNetworkBlockedError);
  });

  test("a DNS lookup failure does not block — the real fetch surfaces its own error", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    const failingLookup = async () => {
      throw Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" });
    };
    await expect(assertNetworkAllowed("https://nope.invalid", failingLookup)).resolves.toBeUndefined();
  });
});
