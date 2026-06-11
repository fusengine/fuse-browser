/**
 * Live task on the LOCAL (modified-code) MCP server: cheapest hotel ROOM in Milan
 * on booking.com (not activities/tickets). Sorts by price, scrolls to load cards,
 * and extracts only the amounts anchored to "N nights, M adults" — the per-stay
 * room totals — then reports the lowest with its hotel-card context.
 * Run: `node --import tsx tests/live/live-milan.ts`
 * @module tests/live/live-milan
 */
import { connect, payload } from "./live-checks.js";

const URL =
  "https://www.booking.com/searchresults.html?ss=Milan&checkin=2026-07-15&checkout=2026-07-17&group_adults=2&no_rooms=1&selected_currency=EUR&order=price&lang=en-gb";

/** A room offer parsed from the card text. */
interface Room {
  amount: number;
  context: string;
}

/** Extract per-stay room totals: amounts directly tied to "N nights, M adults". */
function rooms(text: string): Room[] {
  const flat = text.replace(/[‎‏ ]/g, " ");
  const re = /nights?,\s*\d+\s*adults?\s*€\s*([\d',.]+)/gi;
  const out: Room[] = [];
  for (const m of flat.matchAll(re)) {
    const amount = Number((m[1] ?? "").replace(/['\s]/g, "").replace(/\.(?=\d{3})/g, ""));
    const at = m.index ?? 0;
    if (amount >= 30) out.push({ amount, context: flat.slice(Math.max(0, at - 220), at).replace(/\n{2,}/g, "\n").trim() });
  }
  return out;
}

async function main(): Promise<void> {
  const client = await connect();
  const open = payload(await client.callTool({ name: "browser_open", arguments: { currency: "EUR", humanMode: true, blockResources: ["media", "font", "image"] } }));
  const sid = String(open.sessionId);
  const nav = payload(await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: URL, waitMs: 6000 } }));
  console.log(`nav: "${String(nav.title).slice(0, 70)}"`);
  await client.callTool({ name: "browser_wait_for", arguments: { sessionId: sid, text: "adults", timeoutMs: 15_000 } }).catch(() => {});
  for (let s = 0; s < 3; s += 1) {
    await client.callTool({ name: "browser_scroll", arguments: { sessionId: sid, deltaY: 2600 } });
    await client.callTool({ name: "browser_wait", arguments: { sessionId: sid, ms: 1000 } }).catch(() => {});
  }

  const txt = payload(await client.callTool({ name: "browser_extract", arguments: { sessionId: sid, kind: "text", format: "text" } }));
  const found = rooms(String(txt.text ?? "")).sort((a, b) => a.amount - b.amount);
  const seen = new Set<number>();
  const uniq = found.filter((r) => (seen.has(r.amount) ? false : seen.add(r.amount)));
  console.log(`\nchambres (prix séjour 2 nuits, 2 adultes): ${uniq.length}`);
  for (const r of uniq.slice(0, 10)) console.log(`  EUR ${r.amount.toFixed(2)}`);

  const cheapest = uniq[0];
  console.log(cheapest ? `\n>>> CHAMBRE LA MOINS CHÈRE: EUR ${cheapest.amount.toFixed(2)} (15–17 juil, 2 adultes)\n--- carte ---\n${cheapest.context.slice(-320)}` : "\n>>> aucune chambre détectée");

  await client.callTool({ name: "browser_close", arguments: { sessionId: sid } });
  await client.close();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
