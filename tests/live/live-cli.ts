/**
 * Live non-regression + parity check for the 6 new one-shot CLI page commands.
 * Spawns the real CLI binary against real sites and validates JSON output / exit
 * codes, plus a regression sweep (15 commands in --help, probe still works).
 *
 * Run: `node --import tsx tests/live/live-cli.ts`
 * @module tests/live/live-cli
 */
import { type CliResult, parseJson, runCli } from "./live-cli-run.js";

let failures = 0;

/** Assert `cond`; print PASS/FAIL with a short detail line. */
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
    return;
  }
  failures += 1;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Run a command, parse stdout JSON, and apply `assert` to it. */
async function probeCmd(args: string[], assert: (r: CliResult, j: Record<string, unknown> | null) => void): Promise<void> {
  const r = await runCli(args);
  assert(r, parseJson(r.stdout));
}

async function newCommands(): Promise<void> {
  await probeCmd(["products", "https://www.digitec.ch/en/search?q=macbook", "--wait-ms", "5000"], (r, j) =>
    check("products → non-empty", r.code === 0 && Array.isArray(j?.products) && (j?.count as number) > 0, `count=${j?.count}`));
  await probeCmd(["extract", "https://example.com", "--kind", "text"], (r, j) =>
    check("extract text → non-empty", r.code === 0 && typeof j?.text === "string" && (j.text as string).length > 0, `${(j?.text as string)?.slice(0, 30)}…`));
  await probeCmd(["snapshot", "https://example.com"], (r, j) =>
    check("snapshot → count > 0", r.code === 0 && (j?.count as number) > 0, `count=${j?.count}`));
  await probeCmd(["run", "https://example.com", "--steps", '[{"type":"wait","ms":500},{"type":"extract","kind":"text"}]'], (r, j) =>
    check("run → ok:true", r.code === 0 && j?.ok === true, `steps=${(j?.steps as unknown[])?.length}`));
}

async function screenshotAndInspect(): Promise<void> {
  const out = "/tmp/cli-shot.png";
  const shot = await runCli(["screenshot", "https://example.com", "--full-page", "--output", out]);
  const { existsSync, statSync } = await import("node:fs");
  check("screenshot → file written", shot.code === 0 && existsSync(out) && statSync(out).size > 0,
    existsSync(out) ? `${statSync(out).size} bytes` : "missing");
  // inspect needs a ref from the snapshot; example.com's single link is ref "0".
  await probeCmd(["inspect", "https://example.com", "--ref", "0"], (r, j) =>
    check("inspect → style present", r.code === 0 && j?.style != null, `ref=${j?.ref}`));
}

async function regression(): Promise<void> {
  const help = await runCli(["--help"]);
  const cmds = ["probe", "fetch", "fetch-batch", "crawl", "collect-batch", "serp-batch", "shots", "shots-batch",
    "site-shots", "run", "products", "extract", "snapshot", "screenshot", "inspect"];
  const listed = cmds.filter((c) => new RegExp(`\\n  ${c} `).test(help.stdout));
  check("--help lists 15 commands", listed.length === 15, `listed=${listed.length}: ${cmds.filter((c) => !listed.includes(c)).join(",") || "all"}`);
  await probeCmd(["probe", "https://example.com", "--extract-prices"], (r, j) =>
    check("probe regression", r.code === 0 && typeof j?.url === "string", `url=${j?.url}`));
}

async function main(): Promise<void> {
  await newCommands();
  await screenshotAndInspect();
  await regression();
  console.log(failures === 0 ? "\nRESULT: all CLI commands PASS (zero regression)" : `\nRESULT: ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
