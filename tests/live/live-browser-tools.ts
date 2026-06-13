/**
 * Live test of the new session tools: browser_cookies, browser_route (mock),
 * browser_pdf, browser_permissions, browser_clipboard.
 * Run: `node --import tsx tests/live/live-browser-tools.ts`
 * @module tests/live/live-browser-tools
 */
import { check, connect, payload, state } from "./live-checks.js";

async function main(): Promise<void> {
  const client = await connect();
  const open = payload(await client.callTool({ name: "browser_open", arguments: { url: "https://example.com" } }));
  const sid = String(open.sessionId);
  await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: "https://example.com", waitMs: 800 } });

  // cookies: set → get → clear
  const setc = payload(await client.callTool({ name: "browser_cookies", arguments: { sessionId: sid, action: "set", cookies: [{ name: "fuse", value: "live", url: "https://example.com" }] } }));
  check("browser_cookies set", Number(setc.added) === 1, JSON.stringify(setc));
  const getc = payload(await client.callTool({ name: "browser_cookies", arguments: { sessionId: sid, action: "get" } }));
  const has = ((getc.cookies as Array<{ name: string; value: string }> | undefined) ?? []).some((c) => c.name === "fuse" && c.value === "live");
  check("browser_cookies get retrouve le cookie posé", has, `${(getc.cookies as unknown[] | undefined)?.length} cookies`);

  // route: mock a document response, then navigate to it
  await client.callTool({ name: "browser_route", arguments: { sessionId: sid, pattern: "**/mocked", action: "mock", status: 200, body: "<h1>FUSE-MOCK-OK</h1>", contentType: "text/html" } });
  await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: "https://example.com/mocked", waitMs: 600 } });
  const mtxt = payload(await client.callTool({ name: "browser_extract", arguments: { sessionId: sid, kind: "text", format: "text" } }));
  check("browser_route mock une réponse réseau (fulfill)", /FUSE-MOCK-OK/.test(String(mtxt.text ?? "")), String(mtxt.text ?? "").slice(0, 40));

  // pdf: generate from the live page (headless)
  const pdf = payload(await client.callTool({ name: "browser_pdf", arguments: { sessionId: sid } }));
  check("browser_pdf génère un PDF (bytes > 0)", Number(pdf.bytes) > 1000, `bytes=${String(pdf.bytes)}, code=${String(pdf.code ?? "")}`);

  // permissions + clipboard: grant then write/read
  await client.callTool({ name: "browser_permissions", arguments: { sessionId: sid, permissions: ["clipboard-read", "clipboard-write"], origin: "https://example.com" } });
  const w = payload(await client.callTool({ name: "browser_clipboard", arguments: { sessionId: sid, action: "write", text: "fuse-clip-42" } }));
  check("browser_clipboard write", w.written === true || w.code === "clipboard_denied", JSON.stringify(w));
  const r = payload(await client.callTool({ name: "browser_clipboard", arguments: { sessionId: sid, action: "read" } }));
  check("browser_clipboard read relit le texte écrit", r.text === "fuse-clip-42" || r.code === "clipboard_denied", JSON.stringify(r));

  await client.callTool({ name: "browser_close", arguments: { sessionId: sid } });
  await client.close();
  console.log(state.failures === 0 ? "\nRESULT: new browser tools OK en réel" : `\nRESULT: ${state.failures} échec(s)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
