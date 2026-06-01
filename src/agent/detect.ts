/**
 * Challenge detection and optional captcha solving for a probe run.
 * @module agent/detect
 */
import type { Page } from "playwright";
import { solveIfEnabled } from "../captcha/solve.js";
import { detectChallenges } from "../extraction/challenges.js";
import type { Challenges } from "../interfaces/extraction.js";
import type { CaptchaOutcome } from "../interfaces/net.js";
import type { ProbeOptions } from "../interfaces/types.js";
import type { ResolvedConfig } from "./config.js";

/** Detection result: challenge flags plus an optional captcha outcome. */
export interface DetectResult {
  challenges: Challenges | Record<string, never>;
  captcha?: CaptchaOutcome;
}

/** Detect challenges (when requested) and solve a captcha when opted-in. */
export async function detectAndSolve(
  page: Page,
  text: string,
  options: ProbeOptions,
  config: ResolvedConfig,
): Promise<DetectResult> {
  const challenges =
    options.detectChallenges || options.solveCaptcha ? await detectChallenges(page, text) : {};
  const captcha = await solveIfEnabled(page, challenges, options, config);
  return { challenges, captcha };
}
