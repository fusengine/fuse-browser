/**
 * Live E2E scenario on real websites: full agent workflow on books.toscrape.com
 * (navigate, price extraction, snapshot, tabs, network blocking, screenshot).
 * Run: `node --import tsx tests/live/live-scenario.ts`
 * @module tests/live/live-scenario
 */
import { check, connect, type NetRow, payload, state } from "./live-checks.js";

const SHOP = "https://books.toscrape.com/";
const WIKI = "https://en.wikipedia.org/wiki/Web_scraping";

/** Image content block of an MCP CallToolResult. */
interface ImageBlock {
  type: string;
  data?: string;
}

async function main(): Promise<void> {
  const client = await connect();
  const open = payload(
    await client.callTool({ name: "browser_open", arguments: { blockResources: ["image", "font"] } }),
  );
  const sid = String(open.sessionId);
  check("open session (blockResources image+font)", sid.length > 0, `sessionId=${sid}`);

  const nav = payload(
    await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: SHOP, waitMs: 1200 } }),
  );
  check("navigate books.toscrape.com", String(nav.title).includes("Books to Scrape"), `title=${String(nav.title)}`);

  const extract = payload(
    await client.callTool({ name: "browser_extract", arguments: { sessionId: sid, kind: "prices" } }),
  );
  // The listing shows 20 books: every <article> card's price must be captured,
  // not just the first (mainText now joins all matches).
  const prices = (extract.prices as Array<{ currency: string; amount: number }> | undefined) ?? [];
  check("extract: prix de toute la grille (≥10 GBP distincts)",
    prices.length >= 10 && prices.every((p) => p.currency === "GBP"),
    `${prices.length} prix, ex: ${JSON.stringify(prices.slice(0, 3))}`);

  const snap = payload(await client.callTool({ name: "browser_snapshot", arguments: { sessionId: sid } }));
  check("snapshot: éléments interactifs", Number(snap.count) > 10, `count=${String(snap.count)}`);

  const tabs = payload(
    await client.callTool({ name: "browser_tabs", arguments: { sessionId: sid, action: "new", url: WIKI } }),
  );
  const tabList = (tabs.tabs as Array<{ url: string }> | undefined) ?? [];
  check("tabs: Wikipedia ouvert en onglet 2", tabList.length === 2 && tabList[1]?.url.includes("wikipedia.org"),
    `active=${String(tabs.active)}, urls=${JSON.stringify(tabList.map((t) => t.url.slice(0, 40)))}`);

  const wikiNet = payload(
    await client.callTool({ name: "browser_network", arguments: { sessionId: sid, limit: 80 } }),
  );
  const rows = (wikiNet.requests as NetRow[] | undefined) ?? [];
  const imgOk = rows.filter((r) => r.resourceType === "image" && r.status === 200);
  const docOk = rows.some((r) => r.resourceType === "document" && r.status === 200);
  check("network: document 200, images abortées (blocage actif)", docOk && imgOk.length === 0,
    `${rows.length} requêtes, images en 200: ${imgOk.length}`);

  const back = payload(
    await client.callTool({ name: "browser_tabs", arguments: { sessionId: sid, action: "select", index: 0 } }),
  );
  check("tabs: retour onglet boutique", back.active === 0);

  const shot = (await client.callTool({
    name: "browser_screenshot",
    arguments: { sessionId: sid, fullPage: true },
  })) as { content?: ImageBlock[] };
  const img = (shot.content ?? []).find((c) => c.type === "image");
  check("screenshot fullPage capturé", (img?.data?.length ?? 0) > 10_000, `${img?.data?.length ?? 0} chars base64`);

  const cons = payload(await client.callTool({ name: "browser_console", arguments: { sessionId: sid, level: "error" } }));
  check("console: requêtable (erreurs JS)", typeof cons.count === "number", `count=${String(cons.count)}`);

  const closed = payload(await client.callTool({ name: "browser_close", arguments: { sessionId: sid } }));
  check("close session", closed.closed === true);

  await client.close();
  console.log(state.failures === 0 ? "\nRESULT: scénario réel complet — tout passe" : `\nRESULT: ${state.failures} échec(s)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
