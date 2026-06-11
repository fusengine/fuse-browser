/**
 * Live task on the LOCAL (modified-code) MCP server: find the cheapest real
 * MacBook laptop on digitec.ch. Loads the search, scrolls to load more cards,
 * extracts the page text and pairs each price with the product title on the
 * next line (digitec renders category / "CHF" / amount / title as separate
 * lines), then keeps only "Apple MacBook" laptops (not third-party accessories).
 * Run: `node --import tsx tests/live/live-digitec.ts`
 * @module tests/live/live-digitec
 */
import { connect, payload } from "./live-checks.js";

const URL = "https://www.digitec.ch/en/search?q=macbook";

/** A parsed product: price in CHF + its title. */
interface Product {
  amount: number;
  title: string;
}

/** Parse "1'099.–" / "6.90" / "13.23 currently" → number (CHF). */
function parseAmount(line: string): number | null {
  const m = line.match(/([0-9][0-9'’]*)(?:[.,]([0-9]{2}))?/);
  if (!m) return null;
  const whole = Number((m[1] ?? "").replace(/['’]/g, ""));
  return m[2] ? whole + Number(m[2]) / 100 : whole;
}

/** Pair each "CHF\n<amount>\n<title>" block; keep Apple MacBook laptops. */
function macbooks(text: string): Product[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: Product[] = [];
  for (let i = 0; i < lines.length - 2; i += 1) {
    if (lines[i] !== "CHF") continue;
    const amount = parseAmount(lines[i + 1] ?? "");
    const title = lines[i + 2] ?? "";
    if (amount && /apple\s+macbook/i.test(title)) out.push({ amount, title });
  }
  return out;
}

async function main(): Promise<void> {
  const client = await connect();
  const open = payload(await client.callTool({ name: "browser_open", arguments: { currency: "CHF", humanMode: true, blockResources: ["media", "font"] } }));
  const sid = String(open.sessionId);
  const nav = payload(await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: URL, waitMs: 5000 } }));
  console.log(`nav: "${String(nav.title).slice(0, 60)}"`);
  await client.callTool({ name: "browser_wait_for", arguments: { sessionId: sid, text: "Apple MacBook", timeoutMs: 15_000 } }).catch(() => {});
  for (let s = 0; s < 4; s += 1) {
    await client.callTool({ name: "browser_scroll", arguments: { sessionId: sid, deltaY: 2400 } });
    await client.callTool({ name: "browser_wait", arguments: { sessionId: sid, ms: 900 } }).catch(() => {});
  }

  const txt = payload(await client.callTool({ name: "browser_extract", arguments: { sessionId: sid, kind: "text", format: "text" } }));
  const found = macbooks(String(txt.text ?? "")).sort((a, b) => a.amount - b.amount);
  const seen = new Set<string>();
  const unique = found.filter((p) => (seen.has(p.title) ? false : seen.add(p.title)));

  console.log(`\nApple MacBooks trouvés: ${unique.length}`);
  for (const p of unique.slice(0, 12)) console.log(`  CHF ${p.amount.toFixed(2)} | ${p.title.slice(0, 80)}`);
  const cheapest = unique[0];
  console.log(cheapest ? `\n>>> LE MOINS CHER: CHF ${cheapest.amount.toFixed(2)} — ${cheapest.title}` : "\n>>> aucun MacBook laptop détecté");

  await client.callTool({ name: "browser_close", arguments: { sessionId: sid } });
  await client.close();
  process.exit(cheapest ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
