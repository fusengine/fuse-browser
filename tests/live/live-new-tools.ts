/**
 * Live validation of the new tools on the LOCAL server: browser_autoscroll +
 * browser_products give the cheapest MacBook on digitec WITHOUT client-side
 * parsing (the whole point of structured per-card extraction). Also checks the
 * tools are exposed and the screenshot:// resource works.
 * Run: `node --import tsx tests/live/live-new-tools.ts`
 * @module tests/live/live-new-tools
 */
import { check, connect, payload, state } from "./live-checks.js";

const URL = "https://www.digitec.ch/en/search?q=macbook";

/** A structured product from browser_products. */
interface Product {
  title: string;
  price: number;
  currency: string;
}

async function main(): Promise<void> {
  const client = await connect();
  const tools = (await client.listTools()).tools.map((t) => t.name);
  check("browser_products exposé", tools.includes("browser_products"));
  check("browser_autoscroll exposé", tools.includes("browser_autoscroll"));

  const open = payload(await client.callTool({ name: "browser_open", arguments: { currency: "CHF", humanMode: true, blockResources: ["media", "font"] } }));
  const sid = String(open.sessionId);
  await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: URL, waitMs: 4000 } });
  await client.callTool({ name: "browser_wait_for", arguments: { sessionId: sid, text: "Apple MacBook", timeoutMs: 15_000 } }).catch(() => {});

  const scroll = payload(await client.callTool({ name: "browser_autoscroll", arguments: { sessionId: sid, maxScrolls: 5, idleRounds: 2 } }));
  check("browser_autoscroll a chargé la liste", Number(scroll.rounds) >= 1, `rounds=${String(scroll.rounds)}, height=${String(scroll.height)}`);

  const prod = payload(await client.callTool({ name: "browser_products", arguments: { sessionId: sid, limit: 80 } }));
  const all = (prod.products as Product[] | undefined) ?? [];
  check("browser_products renvoie des items structurés {title, price}", all.length > 0, `count=${all.length}`);
  const macs = all.filter((p) => /apple\s+macbook/i.test(p.title)).sort((a, b) => a.price - b.price);
  check("MacBooks isolés et triés par prix", macs.length >= 1, `${macs.length} MacBooks`);
  for (const m of macs.slice(0, 6)) console.log(`  ${m.currency} ${m.price} | ${m.title.slice(0, 70)}`);
  const cheapest = macs[0];
  console.log(cheapest ? `\n>>> via browser_products: LE MOINS CHER = ${cheapest.currency} ${cheapest.price} — ${cheapest.title}` : "\n>>> aucun MacBook");

  const res = await client.readResource({ uri: `screenshot://${sid}/last` }).catch((e: unknown) => ({ err: String(e) }));
  const blob = (res as { contents?: Array<{ blob?: string }> }).contents?.[0]?.blob;
  check("resource screenshot:// renvoie une image", (blob?.length ?? 0) > 5000, `blob=${blob?.length ?? 0} chars`);

  await client.callTool({ name: "browser_close", arguments: { sessionId: sid } });
  await client.close();
  console.log(state.failures === 0 ? "\nRESULT: nouveaux tools OK en réel" : `\nRESULT: ${state.failures} échec(s)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
