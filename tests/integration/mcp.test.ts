/**
 * Integration test: the MCP server exposes the expected tool set with no
 * duplicates. Runs under Node (the SDK export-maps do not resolve under Bun).
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "../../src/server/server.js";

async function listToolNames(): Promise<string[]> {
  const { server } = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const { tools } = await client.listTools();
  await client.close();
  return tools.map((t) => t.name);
}

const EXPECTED = [
  "browser_probe",
  "browser_probe_html",
  "browser_open",
  "browser_status",
  "browser_close",
  "browser_connect",
  "browser_navigate",
  "browser_wait_for",
  "browser_run",
  "browser_click",
  "browser_fill",
  "browser_scroll",
  "browser_press",
  "browser_select",
  "browser_back",
  "browser_forward",
  "browser_wait",
  "browser_login",
  "browser_snapshot",
  "browser_act",
  "browser_extract",
  "browser_extract_schema",
  "browser_screenshot",
];

test("MCP exposes the expected tool set with no duplicates", async () => {
  const names = await listToolNames();
  assert.equal(new Set(names).size, names.length, `duplicate tools: ${names.join(", ")}`);
  assert.deepEqual(new Set(names), new Set(EXPECTED));
});
