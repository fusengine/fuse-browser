/**
 * Live test against Booking.com (real anti-bot, consent wall, hotel prices):
 * full stealth+consent+currency pipeline via browser_probe on a hotel page,
 * then the new tools (network, console, snapshot, extract) on search results.
 * Timezone is left to the host (coherent with the real exit IP — forcing a
 * mismatching TZ is a strong bot signal). Run: `node --import tsx tests/live/live-booking.ts`
 * @module tests/live/live-booking
 */
import { check, connect, type NetRow, payload, state } from "./live-checks.js";

type Mcp = Awaited<ReturnType<typeof connect>>;
type Challenges = { captcha?: boolean; cloudflare?: boolean; turnstile?: boolean; hcaptcha?: boolean };

const PROBE_URL =
  "https://www.booking.com/searchresults.html?ss=Paris&checkin=2026-07-15&checkout=2026-07-17&group_adults=2&no_rooms=1&selected_currency=EUR&lang=fr-fr";
const SEARCH =
  "https://www.booking.com/searchresults.html?ss=Amsterdam&checkin=2026-07-15&checkout=2026-07-17&group_adults=2&no_rooms=1&selected_currency=EUR&lang=en-gb";

/** A) Full pipeline via browser_probe: stealth must reach a real Booking page. */
async function probeHotel(client: Mcp): Promise<void> {
  const r = payload(
    await client.callTool({
      name: "browser_probe",
      arguments: { url: PROBE_URL, currency: "EUR", autoConsent: true, humanMode: true, extractPrices: true, detectChallenges: true, waitMs: 4000 },
    }),
  );
  const title = String(r.title ?? "");
  const text = String(r.text ?? "");
  check("probe: page Booking réelle atteinte (pas un blocage 403)", title.length > 0 && text.length > 400,
    `title="${title.slice(0, 60)}", text=${text.length} chars`);
  const ch = (r.challenges ?? {}) as Challenges;
  const blocked = Boolean(ch.captcha || ch.cloudflare || ch.turnstile || ch.hcaptcha);
  check("probe: pas de challenge bloquant (stealth OK)", !blocked, `challenges=${JSON.stringify(ch)}`);
  const offers = r.hotelOffers as { headline?: { amount: number; currency: string }; options?: unknown[] } | null;
  const prices = (r.prices as Array<{ currency: string; amount: number }> | undefined) ?? [];
  console.log(`  ↳ prix=${prices.length}, headline=${JSON.stringify(offers?.headline ?? null)}, options=${offers?.options?.length ?? 0}, consent=${JSON.stringify(r.consent ?? null)}`);
  check("probe: extraction de prix sur la page Booking", prices.length >= 1 || !!offers?.headline,
    `${prices.length} prix, ex: ${JSON.stringify(prices[0] ?? null)}`);
}

/** B) New tools live on the search-results page (heavier, WAF-guarded). */
async function searchResults(client: Mcp): Promise<void> {
  const open = payload(await client.callTool({ name: "browser_open", arguments: { currency: "EUR", humanMode: true, blockResources: ["image", "media", "font"] } }));
  const sid = String(open.sessionId);
  const nav = payload(await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: SEARCH, waitMs: 4000 } }));
  check("search: navigation aboutie sur booking.com", String(nav.url).includes("booking.com"), `url=${String(nav.url).slice(0, 60)}`);

  const net = payload(await client.callTool({ name: "browser_network", arguments: { sessionId: sid, urlContains: "booking.com", limit: 80 } }));
  const rows = (net.requests as NetRow[] | undefined) ?? [];
  // The 80-entry FIFO buffer evicts the initial document on a request-heavy site
  // like Booking; assert real captured traffic (200s) instead of the doc itself.
  const ok200 = rows.filter((r) => r.status === 200);
  check("search: trafic booking.com réel capturé (≥3 réponses 200)", ok200.length >= 3,
    `${rows.length} req booking.com, ${ok200.length} en 200, types=${JSON.stringify([...new Set(rows.map((r) => r.resourceType))])}`);
  check("search: blocage images actif (aucune image en 200)", !rows.some((r) => r.resourceType === "image" && r.status === 200),
    `images 200: ${rows.filter((r) => r.resourceType === "image" && r.status === 200).length}`);

  const ext = payload(await client.callTool({ name: "browser_extract", arguments: { sessionId: sid, kind: "all" } }));
  const offers = ext.hotelOffers as { options?: unknown[] } | null;
  const prices = (ext.prices as Array<{ currency: string }> | undefined) ?? [];
  console.log(`  ↳ extract: prix=${prices.length}, offres=${offers?.options?.length ?? 0}`);
  check("search: browser_extract répond (structure prices/hotelOffers)", Array.isArray(prices) && offers !== undefined,
    `${prices.length} prix, EUR=${prices.filter((p) => p.currency === "EUR").length}`);

  const snap = payload(await client.callTool({ name: "browser_snapshot", arguments: { sessionId: sid } }));
  check("search: snapshot d'éléments interactifs", Number(snap.count) > 0, `count=${String(snap.count)}`);
  const cons = payload(await client.callTool({ name: "browser_console", arguments: { sessionId: sid } }));
  check("search: browser_console requêtable", typeof cons.count === "number", `count=${String(cons.count)}`);
  await client.callTool({ name: "browser_close", arguments: { sessionId: sid } });
}

async function main(): Promise<void> {
  const client = await connect();
  try {
    await probeHotel(client);
    await searchResults(client);
  } finally {
    await client.close();
  }
  console.log(state.failures === 0 ? "\nRESULT: Booking — pipeline réel OK" : `\nRESULT: ${state.failures} échec(s) (Booking durcit l'anti-bot selon l'IP)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
