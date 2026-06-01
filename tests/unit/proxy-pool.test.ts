import { describe, expect, test } from "bun:test";
import { ProxyPool } from "../../src/proxy/pool.js";

describe("ProxyPool", () => {
  test("round-robins across entries", () => {
    const p = new ProxyPool(["a", "b", "c"]);
    expect([p.acquire(), p.acquire(), p.acquire(), p.acquire()]).toEqual(["a", "b", "c", "a"]);
  });

  test("skips a blocked proxy until its cooldown elapses", () => {
    let t = 0;
    const p = new ProxyPool(["a", "b"], 1000, () => t);
    expect(p.acquire()).toBe("a");
    p.reportBlocked("a");
    expect(p.acquire()).toBe("b");
    expect(p.acquire()).toBe("b");
    expect(p.available).toBe(1);
    t = 1000;
    expect(p.available).toBe(2);
  });

  test("returns null when all proxies are cooling", () => {
    let t = 0;
    const p = new ProxyPool(["a"], 1000, () => t);
    expect(p.acquire()).toBe("a");
    p.reportBlocked("a");
    expect(p.acquire()).toBeNull();
  });

  test("empty pool yields null", () => {
    expect(new ProxyPool([]).acquire()).toBeNull();
  });
});
