/**
 * Manual live probe: real reCAPTCHA v2 demo page. Proves detection, live
 * sitekey extraction, and the solver path (real provider HTTP call). With no
 * valid key it reports a clean failure reason instead of throwing.
 * Run: CAPTCHA_KEY=... node --import tsx tests/live/captcha-live.ts
 * @module tests/live/captcha-live
 */
import { maybeSolveCaptcha } from "../../src/captcha/solve.js";
import { loadBrowserType } from "../../src/engine/loader.js";
import { detectChallenges } from "../../src/extraction/challenges.js";
import { mainText } from "../../src/extraction/main-text.js";
import { readSitekey } from "../../src/net/captcha-inject.js";

const DEMO = "https://www.google.com/recaptcha/api2/demo";

const chromium = await loadBrowserType("patchright");
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.goto(DEMO, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const text = await mainText(page);
  const challenges = await detectChallenges(page, text);
  const sitekey = await readSitekey(page);
  process.stderr.write(`detected.captcha=${challenges.captcha} sitekey=${sitekey}\n`);
  const outcome = await maybeSolveCaptcha(page, challenges, {
    provider: "2captcha",
    apiKey: process.env.CAPTCHA_KEY ?? "INVALID_TEST_KEY",
    timeoutMs: 20_000,
    pollMs: 4_000,
  });
  process.stderr.write(`outcome=${JSON.stringify(outcome)}\n`);
} finally {
  await browser.close();
}
