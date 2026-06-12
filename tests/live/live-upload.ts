/**
 * Live test of the new `upload` action (Playwright setInputFiles) on the
 * up-to-date code: spawns a fresh MCP server, opens the-internet upload form,
 * sets the file via browser_act kind:"upload", submits, and verifies the page
 * confirms the upload. Run: `node --import tsx tests/live/live-upload.ts`
 * @module tests/live/live-upload
 */
import { writeFileSync } from "node:fs";
import { check, connect, payload, state } from "./live-checks.js";

const FILE = "/tmp/fuse-upload-live.txt";
const URL = "https://the-internet.herokuapp.com/upload";

async function main(): Promise<void> {
  writeFileSync(FILE, "live upload via fuse-browser setInputFiles\n");
  const client = await connect();
  const open = payload(await client.callTool({ name: "browser_open", arguments: { url: URL } }));
  const sid = String(open.sessionId);
  await client.callTool({ name: "browser_navigate", arguments: { sessionId: sid, url: URL, waitMs: 1500 } });

  const up = payload(await client.callTool({ name: "browser_act", arguments: { sessionId: sid, kind: "upload", target: "#file-upload", files: FILE } }));
  const upOk = (up.result as { ok?: boolean } | undefined)?.ok === true;
  check("browser_act kind:upload accepté + exécuté", upOk, JSON.stringify(up.result ?? up));

  await client.callTool({ name: "browser_act", arguments: { sessionId: sid, kind: "click", target: "#file-submit" } });
  await client.callTool({ name: "browser_wait_for", arguments: { sessionId: sid, text: "File Uploaded", timeoutMs: 10_000 } }).catch(() => {});

  const txt = payload(await client.callTool({ name: "browser_extract", arguments: { sessionId: sid, kind: "text", format: "text" } }));
  const body = String(txt.text ?? "");
  check("page confirme l'upload (File Uploaded!)", /file uploaded/i.test(body), body.slice(0, 80));
  check("nom du fichier uploadé visible", body.includes("fuse-upload-live.txt"), body.replace(/\s+/g, " ").slice(0, 120));

  await client.callTool({ name: "browser_close", arguments: { sessionId: sid } });
  await client.close();
  console.log(state.failures === 0 ? "\nRESULT: upload OK en conditions réelles" : `\nRESULT: ${state.failures} échec(s)`);
  process.exit(state.failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
