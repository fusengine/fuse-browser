import { describe, expect, test } from "bun:test";
import { errorResult, imageJsonResult, jsonResult } from "../../src/server/result.js";

describe("imageJsonResult", () => {
  test("returns an image block + a JSON text block + structuredContent", () => {
    const payload = { url: "https://x.com", count: 2, marks: 2 };
    const r = imageJsonResult("BASE64DATA", payload);
    const image = r.content.find((c) => c.type === "image");
    const text = r.content.find((c) => c.type === "text");
    expect(image).toEqual({ type: "image", data: "BASE64DATA", mimeType: "image/jpeg" });
    expect(text?.type).toBe("text");
    const json = JSON.parse(text && "text" in text ? text.text : "{}");
    expect(json).toEqual(payload);
    expect(r.structuredContent).toEqual(payload);
  });

  test("honors a custom mime type", () => {
    const r = imageJsonResult("X", { a: 1 }, "image/png");
    expect(r.content.find((c) => c.type === "image")).toMatchObject({ mimeType: "image/png" });
  });

  test("jsonResult stays image-free (no regression)", () => {
    const r = jsonResult({ a: 1 });
    expect(r.content.every((c) => c.type === "text")).toBe(true);
  });
});

describe("compact JSON encoding", () => {
  test("jsonResult text block is compact (no pretty-print whitespace) yet parses back", () => {
    const payload = { url: "https://x.com", count: 2, nested: { a: 1 } };
    const r = jsonResult(payload);
    const text = r.content.find((c) => c.type === "text");
    const raw = text && "text" in text ? text.text : "";
    expect(raw).not.toContain("\n");
    expect(raw).toBe(JSON.stringify(payload));
    expect(JSON.parse(raw)).toEqual(payload);
    expect(r.structuredContent).toEqual(payload);
  });

  test("imageJsonResult text block is compact and equivalent to structuredContent", () => {
    const payload = { marks: 3, url: "https://x.com" };
    const r = imageJsonResult("BASE64", payload);
    const text = r.content.find((c) => c.type === "text");
    const raw = text && "text" in text ? text.text : "";
    expect(raw).not.toContain("\n");
    expect(JSON.parse(raw)).toEqual(r.structuredContent);
  });
});

describe("errorResult", () => {
  test("without code: text + isError, no structuredContent (back-compat)", () => {
    const r = errorResult("boom");
    expect(r.isError).toBe(true);
    expect(r.content).toEqual([{ type: "text", text: "boom" }]);
    expect(r.structuredContent).toBeUndefined();
  });

  test("with code: adds structuredContent { code, message }", () => {
    const r = errorResult("session gone", "session_not_found");
    expect(r.isError).toBe(true);
    expect(r.content).toEqual([{ type: "text", text: "session gone" }]);
    expect(r.structuredContent).toEqual({ code: "session_not_found", message: "session gone" });
  });
});
