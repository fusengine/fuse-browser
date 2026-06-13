import { describe, expect, test } from "bun:test";
import type { Locator, Page } from "playwright";
import { drag, dragLocator, hover, hoverLocator } from "../../src/actions/hover-drag.js";

/** A locator stub recording hover() / dragTo() invocations. */
function makeLocator(name = "loc"): { locator: Locator; calls: string[] } {
  const calls: string[] = [];
  const self = {
    name,
    first: () => self,
    hover: async () => void calls.push("hover"),
    dragTo: async (dest: { name: string }) => void calls.push(`dragTo:${dest.name}`),
  };
  return { locator: self as unknown as Locator, calls };
}

/** A locator whose hover()/dragTo() always throw. */
function makeFailingLocator(): Locator {
  const fail = async () => {
    throw new Error("Element is not visible\nstack");
  };
  return { first: () => ({ hover: fail, dragTo: fail }), hover: fail, dragTo: fail } as unknown as Locator;
}

describe("hoverLocator", () => {
  test("calls locator.hover() and reports ok", async () => {
    const { locator, calls } = makeLocator();
    expect(await hoverLocator(locator)).toEqual({ type: "hover", ok: true });
    expect(calls).toEqual(["hover"]);
  });

  test("captures a single-line error on failure", async () => {
    const r = await hoverLocator(makeFailingLocator());
    expect(r).toEqual({ type: "hover", ok: false, error: "Error: Element is not visible" });
  });
});

describe("hover", () => {
  test("resolves target and tags the result", async () => {
    const { locator, calls } = makeLocator();
    const page = { locator: () => locator } as unknown as Page;
    expect(await hover(page, ".menu")).toEqual({ type: "hover", ok: true, target: ".menu" });
    expect(calls).toEqual(["hover"]);
  });

  test("fails without touching the page when target is empty", async () => {
    let touched = false;
    const page = {
      locator: () => {
        touched = true;
        return null as unknown as Locator;
      },
    } as unknown as Page;
    expect(await hover(page, "")).toEqual({ type: "hover", ok: false, error: "no_target" });
    expect(touched).toBe(false);
  });
});

describe("dragLocator", () => {
  test("calls source.dragTo(destination)", async () => {
    const src = makeLocator("src");
    const dst = makeLocator("dst");
    expect(await dragLocator(src.locator, dst.locator)).toEqual({ type: "drag", ok: true });
    expect(src.calls).toEqual(["dragTo:dst"]);
  });

  test("captures a single-line error on failure", async () => {
    const r = await dragLocator(makeFailingLocator(), makeLocator().locator);
    expect(r).toEqual({ type: "drag", ok: false, error: "Error: Element is not visible" });
  });
});

describe("drag", () => {
  test("resolves source + destination and tags the result", async () => {
    const src = makeLocator("src");
    const dst = makeLocator("dst");
    const queried: string[] = [];
    const page = {
      locator: (sel: string) => {
        queried.push(sel);
        return sel === "#src" ? src.locator : dst.locator;
      },
    } as unknown as Page;
    expect(await drag(page, "#src", "#dst")).toEqual({ type: "drag", ok: true, target: "#src", to: "#dst" });
    expect(queried).toEqual(["#src", "#dst"]);
    expect(src.calls).toEqual(["dragTo:dst"]);
  });

  test("fails without source / destination", async () => {
    const p = {} as unknown as Page;
    expect(await drag(p, "", "#dst")).toEqual({ type: "drag", ok: false, error: "no_target" });
    expect(await drag(p, "#src", "")).toEqual({ type: "drag", ok: false, error: "no_destination" });
  });
});
