/**
 * Stealth signal definitions and scoring for the anti-bot benchmark.
 * Each target declares text-based PASS/FAIL signals extracted from the
 * probe report's `text` field. Signals are intentionally conservative:
 * a signal can only FAIL on a positive detection, never on absence of
 * the page text (that is reported separately as an UNREACHABLE target).
 * @module tests/live/stealth-signals
 */

/** One detectable stealth signal evaluated against lowercased page text. */
export interface Signal {
  /** Human-readable label printed in the report. */
  label: string;
  /** Returns true when the signal PASSES (stealth holds). */
  ok: (text: string) => boolean;
}

/** A detection target: a public, stable anti-bot test page. */
export interface Target {
  /** Short identifier used in the report. */
  name: string;
  /** Absolute URL probed via the MCP server. */
  url: string;
  /** Milliseconds to wait after load for client-side tests to settle. */
  waitMs: number;
  /** Signals evaluated against the rendered text. */
  signals: Signal[];
}

/** True when `needle` is absent from `text` (a clean, non-detected state). */
const absent = (text: string, needle: string): boolean => !text.includes(needle);

/**
 * Read a "NN% <label>" percentage emitted by creepjs (e.g. "33% headless").
 * Returns the integer percentage, or null when the label is not present.
 */
function creepPct(text: string, label: string): number | null {
  const m = new RegExp(`(\\d+)\\s*%\\s*${label}`).exec(text);
  return m ? Number(m[1]) : null;
}

/** PASS when the creepjs percentage exists and stays at/below `max`. */
function creepBelow(text: string, label: string, max: number): boolean {
  const pct = creepPct(text, label);
  return pct !== null && pct <= max;
}

/**
 * Stable, public detection targets (verified live, 2026-06).
 * sannysoft + creepjs + browserleaks each surface complementary signals.
 */
export const TARGETS: Target[] = [
  {
    name: "sannysoft",
    url: "https://bot.sannysoft.com/",
    waitMs: 6000,
    signals: [
      { label: "no HeadlessChrome in UA", ok: (t) => absent(t, "headlesschrome") },
      { label: "webdriver not 'present (failed)'", ok: (t) => absent(t, "present (failed)") },
      { label: "no '(failed)' verdicts", ok: (t) => absent(t, "(failed)") },
      { label: "plugins reported (PluginArray)", ok: (t) => t.includes("pluginarray") || t.includes("plugins") },
    ],
  },
  {
    // creepjs renders its summary as text: "NN% like headless", "NN% headless",
    // "NN% stealth" (lower = better, near-0% ideal; confirmed via decodo +
    // creepjs source). We score those percentages directly rather than a
    // misleading absence check on the word "headless", always present as a label.
    name: "creepjs",
    url: "https://abrahamjuliot.github.io/creepjs/",
    waitMs: 12000,
    signals: [
      { label: "no 'webdriver' leak", ok: (t) => absent(t, "webdriver") },
      { label: "headless score <= 50%", ok: (t) => creepBelow(t, "headless", 50) },
      { label: "'like headless' score <= 60%", ok: (t) => creepBelow(t, "like headless", 60) },
      { label: "summary rendered (has headless score)", ok: (t) => creepPct(t, "headless") !== null },
    ],
  },
  {
    name: "browserleaks-js",
    url: "https://browserleaks.com/javascript",
    waitMs: 5000,
    signals: [
      { label: "webdriver = false", ok: (t) => absent(t, "webdriver true") && !/webdriver\s+true/.test(t) },
      { label: "no HeadlessChrome token", ok: (t) => absent(t, "headlesschrome") },
      { label: "languages present", ok: (t) => t.includes("language") },
    ],
  },
];
