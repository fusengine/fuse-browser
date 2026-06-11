/**
 * Live checks #2 (real browser, real network): named profile save/load cycle,
 * blockResources network aborts, and MCP progress notifications.
 * Run: `node --import tsx tests/live/live-check-2.ts`
 * @module tests/live/live-check-2
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { check, connect, type NetRow, payload, state } from "./live-checks.js";
import { FAKE_ORIGIN, startCookieProxy } from "./live-proxy.js";

const HOME = "/tmp/fuse-live-home";
const PROFILE_FILE = `${HOME}/profiles/livetest.json`;
// Real https page: Playwright never emits network events for data: pages (pw#7280, #34383).
const IMG_PAGE = "https://www.wikipedia.org/";

/** 1) Profile: real save on close, then real load (configured-context) on reopen. */
async function checkProfile(client: Client): Promise<void> {
  const proxy = await startCookieProxy();
  const proxyUrl = `http://127.0.0.1:${proxy.port}`;
  const open = payload(await client.callTool({ name: "browser_open", arguments: { profile: "livetest", proxyUrl } }));
  const sid = String(open.sessionId);
  const nav = payload(await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: "https://example.com" } }));
  check("profile: navigate https://example.com", nav.title === "Example Domain", `title=${String(nav.title)}`);
  await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: `http://${FAKE_ORIGIN}/` } });
  await client.callTool({ name: "browser_close", arguments: { sessionId: sid } });
  const saved = existsSync(PROFILE_FILE) ? readFileSync(PROFILE_FILE, "utf8") : "";
  check("profile: livetest.json écrit dans FUSE_BROWSER_HOME", saved.length > 0, PROFILE_FILE);
  check('profile: storageState contient "example.com" (cookie + origin)', saved.includes("example.com") && saved.includes('"fuse"'),
    saved.replace(/\s+/g, " ").slice(0, 200));
  const re = payload(await client.callTool({ name: "browser_open", arguments: { profile: "livetest", proxyUrl } }));
  const sid2 = String(re.sessionId);
  check("profile: réouverture du même profil sans erreur", typeof re.sessionId === "string" && sid2.length > 0, `sessionId=${sid2}`);
  await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid2, url: `http://${FAKE_ORIGIN}/` } });
  check("profile: cookie rejoué au reload (chemin configured-context)", proxy.lastCookie()?.includes("fuse=live") === true,
    `Cookie reçu par le proxy: ${String(proxy.lastCookie())}`);
  await client.callTool({ name: "browser_close", arguments: { sessionId: sid2 } });
  await proxy.close();
}

/** Open (with/without blockResources), load IMG_PAGE, return its image network rows. */
async function imageRows(client: Client, blocked: boolean): Promise<NetRow[]> {
  const args = blocked ? { blockResources: ["image"] } : {};
  const open = payload(await client.callTool({ name: "browser_open", arguments: args }));
  const sid = String(open.sessionId);
  const nav = payload(await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: IMG_PAGE, waitMs: 2500 } }));
  check(`blockResources: document non bloqué (${blocked ? "avec" : "sans"} blocage)`,
    String(nav.url).startsWith("https://www.wikipedia.org"), `url=${String(nav.url).slice(0, 48)}`);
  const net = payload(await client.callTool({ name: "browser_network", arguments: { sessionId: sid, limit: 80 } }));
  await client.callTool({ name: "browser_close", arguments: { sessionId: sid } });
  return ((net.requests as NetRow[] | undefined) ?? []).filter((r) => r.resourceType === "image");
}

/** 2) blockResources: images aborted (request seen, no response); counter-proof gets 200s. */
async function checkBlockResources(client: Client): Promise<void> {
  const aborted = await imageRows(client, true);
  const allAborted = aborted.length >= 1 && aborted.every((r) => r.status === undefined);
  check("blockResources: images abortées (requêtes visibles, aucune réponse 200)", allAborted,
    `${aborted.length} image(s), ex: ${JSON.stringify(aborted[0] ?? null)}`);
  const free = await imageRows(client, false);
  check("blockResources: contre-épreuve sans blocage → au moins une image en 200",
    free.some((r) => r.status === 200), `${free.length} image(s)`);
}

/** 3) Progress notifications received client-side during browser_fetch_batch. */
async function checkProgress(client: Client): Promise<void> {
  const events: Array<{ progress: number; total?: number }> = [];
  await client.callTool(
    { name: "browser_fetch_batch", arguments: { urls: ["https://example.com", "https://example.org"] } },
    CallToolResultSchema,
    { onprogress: (p) => events.push({ progress: p.progress, total: p.total }), resetTimeoutOnProgress: true },
  );
  const ok = events.length >= 1 && events.every((e) => typeof e.progress === "number") && events.some((e) => e.total === 2);
  check("progress: notifications onprogress reçues (progress numérique, total=2)", ok, JSON.stringify(events));
}

async function main(): Promise<void> {
  rmSync(HOME, { recursive: true, force: true });
  const client = await connect({ FUSE_BROWSER_HOME: HOME });
  try {
    await checkProfile(client);
    await checkBlockResources(client);
    await checkProgress(client);
  } finally {
    await client.close();
    rmSync(HOME, { recursive: true, force: true });
  }
  console.log(state.failures === 0 ? "\nRESULT: tout passe en conditions réelles" : `\nRESULT: ${state.failures} échec(s)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
