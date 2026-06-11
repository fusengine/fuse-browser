/**
 * Stealth non-regression benchmark: drives the local MCP server's
 * `browser_probe` against public anti-bot detection pages and scores
 * the resulting page text for known leak signatures (webdriver,
 * HeadlessChrome, failed verdicts, missing plugins/languages).
 *
 * Honest by design: each signal can only FAIL on a positive detection.
 * Targets that cannot be reached are reported as UNREACHABLE and do not
 * silently inflate the score.
 *
 * Run: `node --import tsx tests/live/stealth-bench.ts`
 * Exit 0 when global pass ratio >= THRESHOLD, else exit 1.
 * @module tests/live/stealth-bench
 */
import { connect, payload } from "./live-checks.js";
import { TARGETS, type Target } from "./stealth-signals.js";

/** Minimum global pass ratio (0..1) required for a green run. */
const THRESHOLD = 0.8;

/** Per-target outcome accumulator. */
interface Outcome {
  passed: number;
  total: number;
  reachable: boolean;
}

/** Probe one target and print its per-signal verdicts. */
async function scoreTarget(
  client: Awaited<ReturnType<typeof connect>>,
  target: Target,
): Promise<Outcome> {
  const res = await client.callTool({
    name: "browser_probe",
    arguments: { url: target.url, waitMs: target.waitMs, detectChallenges: true },
  });
  const text = String((payload(res).text as string | undefined) ?? "").toLowerCase();
  const reachable = text.length > 200;
  console.log(`\n# ${target.name} (${target.url})  [${text.length} chars]`);
  if (!reachable) {
    console.log("  UNREACHABLE — empty/short text, signals skipped");
    return { passed: 0, total: target.signals.length, reachable: false };
  }
  let passed = 0;
  for (const sig of target.signals) {
    const ok = sig.ok(text);
    if (ok) passed += 1;
    console.log(`  ${ok ? "PASS" : "FAIL"} ${sig.label}`);
  }
  console.log(`  SCORE ${passed}/${target.signals.length}`);
  return { passed, total: target.signals.length, reachable: true };
}

/** Run the full benchmark and exit with the threshold verdict. */
async function main(): Promise<void> {
  console.log(`Stealth bench — ${TARGETS.length} targets, threshold ${THRESHOLD}`);
  const client = await connect();
  let passed = 0;
  let total = 0;
  let unreachable = 0;
  try {
    for (const target of TARGETS) {
      const o = await scoreTarget(client, target);
      passed += o.passed;
      total += o.total;
      if (!o.reachable) unreachable += 1;
    }
  } finally {
    await client.close();
  }
  const ratio = total === 0 ? 0 : passed / total;
  console.log(
    `\nGLOBAL ${passed}/${total} (${(ratio * 100).toFixed(0)}%)` +
      (unreachable ? `  — ${unreachable} target(s) UNREACHABLE` : ""),
  );
  const green = ratio >= THRESHOLD && unreachable < TARGETS.length;
  console.log(green ? "RESULT: STEALTH OK (non-regression)" : "RESULT: STEALTH REGRESSION");
  process.exit(green ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
