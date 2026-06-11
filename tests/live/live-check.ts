/**
 * Live non-regression check for fuse-browser MCP server (real browser, real sites).
 * 1) tools/list contains every pre-change tool + the 5 new ones
 * 2) FUSE_CAPS=core filters tool exposure
 * 3) New tools exercised live: tabs, dialog, downloads, console, network,
 *    visual_diff path validation.
 *
 * Run: `node --import tsx tests/live/live-check.ts`
 * @module tests/live/live-check
 */
import { BASELINE, NEW_TOOLS, check, connect, payload, state } from "./live-checks.js";

/** Minimal shape of a tab entry returned by browser_tabs. */
interface TabEntry {
  url?: string;
}

async function main(): Promise<void> {
  // 1) Full server: no tool regression
  const full = await connect();
  const tools = (await full.listTools()).tools.map((t) => t.name);
  const missing = BASELINE.filter((t) => !tools.includes(t));
  check(`baseline intact (${BASELINE.length} tools d'origine)`, missing.length === 0,
    missing.length ? `MANQUANTS: ${missing.join(", ")}` : `${tools.length} tools exposés`);
  const missingNew = NEW_TOOLS.filter((t) => !tools.includes(t));
  check("5 nouveaux tools présents", missingNew.length === 0,
    missingNew.length ? `manquants: ${missingNew.join(", ")}` : NEW_TOOLS.join(", "));

  // 2) FUSE_CAPS filtering
  const coreOnly = await connect({ FUSE_CAPS: "core" });
  const coreTools = (await coreOnly.listTools()).tools.map((t) => t.name);
  check("FUSE_CAPS=core filtre les batchs", !coreTools.includes("browser_probe") && coreTools.includes("browser_navigate"),
    `${coreTools.length} tools (vs ${tools.length})`);
  await coreOnly.close();

  // 3) Real session on a real site
  const open = payload(await full.callTool({ name: "browser_open", arguments: { url: "https://example.com" } }));
  const sessionId = open.sessionId as string;
  check("browser_open sur example.com", typeof sessionId === "string" && sessionId.length > 0, `sessionId=${sessionId}`);

  // tabs
  const tabNew = payload(await full.callTool({ name: "browser_tabs", arguments: { sessionId, action: "new", url: "https://example.org" } }));
  const newTabs = tabNew.tabs as TabEntry[] | undefined;
  check("browser_tabs new (example.org)", newTabs?.length === 2, `tabs=${newTabs?.length}, active=${tabNew.active}`);
  const tabSel = payload(await full.callTool({ name: "browser_tabs", arguments: { sessionId, action: "select", index: 0 } }));
  const selTabs = tabSel.tabs as TabEntry[] | undefined;
  check("browser_tabs select 0", tabSel.active === 0, JSON.stringify(selTabs?.map((t) => t.url)));
  const tabClose = payload(await full.callTool({ name: "browser_tabs", arguments: { sessionId, action: "close", index: 1 } }));
  check("browser_tabs close 1", (tabClose.tabs as TabEntry[] | undefined)?.length === 1);

  // dialog: arm accept, auto-fire a confirm() on load
  await full.callTool({ name: "browser_dialog", arguments: { sessionId, action: "accept" } });
  const dlgPage = "data:text/html,<script>window.confirmed = confirm('go?');</script><body>dlg</body>";
  await full.callTool({ name: "browser_navigate", arguments: { sessionId, url: dlgPage } });
  await new Promise((r) => setTimeout(r, 800));
  const dlg = payload(await full.callTool({ name: "browser_dialog", arguments: { sessionId, action: "accept" } }));
  const recent = (dlg.recent ?? []) as Array<{ type: string }>;
  check("browser_dialog capture le confirm()", recent.some((d) => d.type === "confirm"),
    `recent=${JSON.stringify(recent.slice(0, 2))}`);

  // downloads: auto-click a download anchor
  const dlPage = "data:text/html,<a id='d' download='hello.txt' href='data:text/plain,bonjour'>dl</a><script>document.getElementById('d').click();</script>";
  await full.callTool({ name: "browser_navigate", arguments: { sessionId, url: dlPage } });
  await new Promise((r) => setTimeout(r, 1500));
  const dls = payload(await full.callTool({ name: "browser_downloads", arguments: { sessionId } }));
  const downloads = dls.downloads as unknown[] | undefined;
  check("browser_downloads capture le fichier", ((dls.count as number) ?? 0) >= 1, JSON.stringify(downloads?.[0] ?? null));

  // console + network on a real site
  await full.callTool({ name: "browser_navigate", arguments: { sessionId, url: "https://example.com" } });
  const net = payload(await full.callTool({ name: "browser_network", arguments: { sessionId } }));
  const requests = net.requests as unknown[] | undefined;
  check("browser_network voit les requêtes", ((net.count as number) ?? 0) >= 1,
    `${net.count} requêtes, ex: ${JSON.stringify(requests?.[0] ?? null).slice(0, 140)}`);
  const cons = await full.callTool({ name: "browser_console", arguments: { sessionId } });
  check("browser_console répond", !(cons as { isError?: boolean }).isError, `count=${payload(cons).count}`);

  // visual_diff path hardening
  const bad = await full.callTool({ name: "browser_visual_diff", arguments: { a: "/etc/passwd", b: "/tmp/x.txt" } });
  check("browser_visual_diff rejette les non-.png", (bad as { isError?: boolean }).isError === true,
    (payload(bad)._raw as string | undefined)?.slice(0, 100) ?? JSON.stringify(payload(bad)).slice(0, 100));

  // structured error code on unknown session
  const lost = await full.callTool({ name: "browser_navigate", arguments: { sessionId: "deadbeef0000", url: "https://example.com" } });
  const lostPayload = (lost as { structuredContent?: { code?: string } }).structuredContent;
  check("code erreur structuré (session_not_found)", lostPayload?.code === "session_not_found", JSON.stringify(lostPayload));

  await full.callTool({ name: "browser_close", arguments: { sessionId } });
  await full.close();

  console.log(state.failures === 0 ? "\nRESULT: ZERO REGRESSION — tout passe en conditions réelles" : `\nRESULT: ${state.failures} échec(s)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
