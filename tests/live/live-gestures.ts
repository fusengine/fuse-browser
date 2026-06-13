/**
 * Live test of the new `hover` and `drag` actions (browser_act) on real sites.
 * Run: `node --import tsx tests/live/live-gestures.ts`
 * @module tests/live/live-gestures
 */
import { check, connect, payload, state } from "./live-checks.js";

interface El { href?: string; visible?: boolean }

async function main(): Promise<void> {
  const client = await connect();

  // --- hover: the-internet/hovers reveals a "View profile" link on hover ---
  const o1 = payload(await client.callTool({ name: "browser_open", arguments: { url: "https://the-internet.herokuapp.com/hovers" } }));
  const s1 = String(o1.sessionId);
  await client.callTool({ name: "browser_navigate", arguments: { sessionId: s1, url: "https://the-internet.herokuapp.com/hovers", waitMs: 1200 } });
  await client.callTool({ name: "browser_act", arguments: { sessionId: s1, kind: "hover", target: ".figure:nth-child(3)" } });
  const snap = payload(await client.callTool({ name: "browser_snapshot", arguments: { sessionId: s1 } }));
  const profileVisible = ((snap.elements as El[] | undefined) ?? []).some((e) => (e.href ?? "").includes("/users/") && e.visible === true);
  check("hover révèle le lien 'View profile' (caption au survol)", profileVisible, `lien users visible=${profileVisible}`);
  await client.callTool({ name: "browser_close", arguments: { sessionId: s1 } });

  // --- drag: the-internet/drag_and_drop ---
  const o2 = payload(await client.callTool({ name: "browser_open", arguments: { url: "https://the-internet.herokuapp.com/drag_and_drop" } }));
  const s2 = String(o2.sessionId);
  await client.callTool({ name: "browser_navigate", arguments: { sessionId: s2, url: "https://the-internet.herokuapp.com/drag_and_drop", waitMs: 1200 } });
  const dr = payload(await client.callTool({ name: "browser_act", arguments: { sessionId: s2, kind: "drag", target: "#column-a", to: "#column-b" } }));
  const dragOk = (dr.result as { ok?: boolean } | undefined)?.ok === true;
  check("drag action exécutée sans erreur (dragTo source→destination)", dragOk, JSON.stringify(dr.result ?? dr));
  await client.callTool({ name: "browser_close", arguments: { sessionId: s2 } });

  await client.close();
  console.log(state.failures === 0 ? "\nRESULT: gestures OK en réel" : `\nRESULT: ${state.failures} échec(s)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
