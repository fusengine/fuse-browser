/**
 * Live proof that IndexedDB is persisted across sessions via storageStatePath.
 * A local HTTP origin serves a page that, on load, reads a token from IndexedDB
 * and renders it into the DOM (so it is observable through browser_extract).
 * With `?seed=<token>` the page first writes the token to IndexedDB.
 *
 * Flow: open (storageStatePath) → navigate ?seed=<token> (write) → close (save)
 * → reopen (same storageStatePath) → navigate (no seed, read) → extract text.
 * If the token reappears, IndexedDB was replayed from the saved storage state.
 *
 * Run: `node --import tsx tests/live/live-persist-idb.ts`
 * @module tests/live/live-persist-idb
 */
import { createServer, type Server } from "node:http";
import { rmSync } from "node:fs";
import { check, connect, payload, state } from "./live-checks.js";

const TOKEN = `idb-${Date.now()}`;
const PROFILE = "/tmp/fuse-idb-profile.json";

/** Page that writes (?seed) then reads a token from IndexedDB into #out. */
const PAGE = `<!doctype html><html><body><div id="out">pending</div><script>
const seed = new URLSearchParams(location.search).get("seed");
const req = indexedDB.open("fuse-auth", 1);
req.onupgradeneeded = () => req.result.createObjectStore("kv");
req.onsuccess = () => {
  const db = req.result;
  const done = (v) => { document.getElementById("out").textContent = v || "EMPTY"; };
  if (seed) {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(seed, "token");
    tx.oncomplete = () => done("wrote:" + seed);
  } else {
    const tx = db.transaction("kv", "readonly");
    const g = tx.objectStore("kv").get("token");
    g.onsuccess = () => done("read:" + (g.result || ""));
  }
};
</script></body></html>`;

/** Start the local origin on an ephemeral 127.0.0.1 port. */
async function startOrigin(): Promise<{ server: Server; port: number }> {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(PAGE);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr !== null ? addr.port : 0;
  return { server, port };
}

async function main(): Promise<void> {
  rmSync(PROFILE, { force: true });
  const { server, port } = await startOrigin();
  const base = `http://127.0.0.1:${port}/`;

  const c1 = await connect();
  const o1 = payload(await c1.callTool({ name: "browser_open", arguments: { storageStatePath: PROFILE } }));
  const s1 = String(o1.sessionId);
  await c1.callTool({ name: "browser_navigate", arguments: { sessionId: s1, url: `${base}?seed=${TOKEN}`, waitMs: 1500 } });
  const wrote = payload(await c1.callTool({ name: "browser_extract", arguments: { sessionId: s1, kind: "text" } }));
  check("wrote token to IndexedDB", String(wrote.text).includes(`wrote:${TOKEN}`), String(wrote.text).slice(0, 60));
  await c1.callTool({ name: "browser_close", arguments: { sessionId: s1 } });
  await c1.close();

  const c2 = await connect();
  const o2 = payload(await c2.callTool({ name: "browser_open", arguments: { storageStatePath: PROFILE } }));
  const s2 = String(o2.sessionId);
  await c2.callTool({ name: "browser_navigate", arguments: { sessionId: s2, url: base, waitMs: 1500 } });
  const read = payload(await c2.callTool({ name: "browser_extract", arguments: { sessionId: s2, kind: "text" } }));
  check("IndexedDB token replayed after reopen", String(read.text).includes(`read:${TOKEN}`), String(read.text).slice(0, 60));
  await c2.callTool({ name: "browser_close", arguments: { sessionId: s2 } });
  await c2.close();

  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(PROFILE, { force: true });
  console.log(state.failures === 0 ? "\nRESULT: IndexedDB persisté/rejoué OK" : `\nRESULT: ${state.failures} échec(s)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
