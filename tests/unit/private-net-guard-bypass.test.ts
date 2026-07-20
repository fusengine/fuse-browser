import { afterEach, describe, expect, test } from "bun:test";
import { assertNetworkAllowed, PrivateNetworkBlockedError } from "../../src/net/private-net-guard.js";

// Regression: the guard test suite previously only exercised isPrivateIp/the
// happy path in isolation, missing that a bracketed IPv6 literal ("[::1]")
// bypassed isIP entirely. These call the REAL entry point (assertNetworkAllowed)
// with the full documented bypass matrix, plus the already-working encoded
// forms, to prevent both regressing.
const ORIGINAL = process.env.FUSE_BLOCK_PRIVATE_NETS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FUSE_BLOCK_PRIVATE_NETS;
  else process.env.FUSE_BLOCK_PRIVATE_NETS = ORIGINAL;
});

describe("assertNetworkAllowed — already-working encoded forms (no regression)", () => {
  test("decimal/octal/hex-encoded/short-form IPv4 loopback (already normalized by URL) is blocked", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    for (const url of ["http://2130706433/", "http://0177.0.0.1/", "http://0x7f000001/", "http://127.1/"]) {
      await expect(assertNetworkAllowed(url)).rejects.toThrow(PrivateNetworkBlockedError);
    }
  });

  test("userinfo, uppercase host, and *.localhost are blocked", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    await expect(assertNetworkAllowed("http://user@127.0.0.1/")).rejects.toThrow(PrivateNetworkBlockedError);
    await expect(assertNetworkAllowed("http://LOCALHOST/")).rejects.toThrow(PrivateNetworkBlockedError);
    await expect(assertNetworkAllowed("http://x.localhost/")).rejects.toThrow(PrivateNetworkBlockedError);
  });

  test("trailing-dot hostname falls through to the DNS check and is still blocked", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    const fakeLookup = async () => ({ address: "127.0.0.1", family: 4 });
    await expect(assertNetworkAllowed("http://localhost./", fakeLookup)).rejects.toThrow(PrivateNetworkBlockedError);
  });

  test("trailing-dot `localhost.` is blocked on the hostname literal alone, even with a FAILING DNS lookup (proves the trailing-dot strip, not DNS luck)", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    const failingDnsLookup = async () => {
      throw Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" });
    };
    await expect(assertNetworkAllowed("http://localhost./", failingDnsLookup)).rejects.toThrow(PrivateNetworkBlockedError);
  });

  test("a public IP literal passes without ever calling DNS", async () => {
    process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
    const lookupThatMustNotBeCalled = async () => {
      throw new Error("DNS must not be called for an IP literal");
    };
    await expect(assertNetworkAllowed("http://8.8.8.8/", lookupThatMustNotBeCalled)).resolves.toBeUndefined();
  });
});

describe("assertNetworkAllowed — IPv6/mapped/CGNAT bypass matrix (regression, live-proven bypass fix)", () => {
  const blockedUrls = [
    "http://[::1]/",
    "http://[0:0:0:0:0:0:0:1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://[fe80::1]/",
    "http://[fe81::1]/",
    "http://[feaa::1]/",
    "http://[febf::1]/",
    "http://[fd00::1]/",
    "http://[::]/",
    "http://0.0.0.0/",
    "http://100.64.0.1/",
    "http://192.0.0.1/",
  ];
  for (const url of blockedUrls) {
    test(`${url} is blocked`, async () => {
      process.env.FUSE_BLOCK_PRIVATE_NETS = "1";
      await expect(assertNetworkAllowed(url)).rejects.toThrow(PrivateNetworkBlockedError);
    });
  }
});
