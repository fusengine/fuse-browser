import { describe, expect, test } from "bun:test";
import { decideStop } from "../../src/actions/auto-scroll.js";
import type { ScrollProbe } from "../../src/interfaces/auto-scroll.js";

const base = {
  idle: 0,
  rounds: 1,
  idleRounds: 2,
  maxScrolls: 20,
  minCount: 1,
  hasSelector: false,
};

const probe = (height: number, count = 0): ScrollProbe => ({ height, count });

describe("decideStop", () => {
  test("continues and resets idle while height grows", () => {
    const out = decideStop({ ...base, prev: probe(1000), curr: probe(1500), idle: 1 });
    expect(out).toEqual({ stop: false, idle: 0 });
  });

  test("increments idle when height is flat", () => {
    const out = decideStop({ ...base, prev: probe(2000), curr: probe(2000), idle: 0 });
    expect(out).toEqual({ stop: false, idle: 1 });
  });

  test("stops after idleRounds consecutive flat rounds", () => {
    const out = decideStop({ ...base, prev: probe(2000), curr: probe(2000), idle: 1 });
    expect(out).toEqual({ stop: true, idle: 2 });
  });

  test("stops when selector reaches minCount", () => {
    const out = decideStop({
      ...base,
      hasSelector: true,
      minCount: 24,
      prev: probe(1000),
      curr: probe(1500, 30),
      idle: 0,
    });
    expect(out.stop).toBe(true);
  });

  test("keeps scrolling when selector under minCount", () => {
    const out = decideStop({
      ...base,
      hasSelector: true,
      minCount: 24,
      prev: probe(1000),
      curr: probe(1500, 10),
      idle: 0,
    });
    expect(out.stop).toBe(false);
  });

  test("stops at maxScrolls cap even while still growing", () => {
    const out = decideStop({ ...base, rounds: 20, prev: probe(1000), curr: probe(1500), idle: 0 });
    expect(out.stop).toBe(true);
  });

  test("first round (prev null) counts as growth", () => {
    const out = decideStop({ ...base, prev: null, curr: probe(800), idle: 0 });
    expect(out).toEqual({ stop: false, idle: 0 });
  });
});
