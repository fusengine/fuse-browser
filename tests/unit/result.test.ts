import { describe, expect, test } from "bun:test";
import { imageJsonResult, jsonResult } from "../../src/server/result.js";

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
