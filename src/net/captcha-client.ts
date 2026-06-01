/**
 * Unified captcha-provider client (2captcha / Anti-Captcha / CapMonster).
 * These providers share the createTask/getTaskResult JSON API, so one adapter
 * only parameterizes the base URL. For authorized testing use only.
 * @module net/captcha-client
 */
import type { CaptchaConfig, CaptchaProvider, CaptchaTask } from "../interfaces/net.js";
import { sleep } from "../lib/retry.js";

const BASE_URL: Record<CaptchaProvider, string> = {
  "2captcha": "https://api.2captcha.com",
  anticaptcha: "https://api.anti-captcha.com",
  capmonster: "https://api.capmonster.cloud",
};

const TASK_TYPE: Record<CaptchaTask["kind"], string> = {
  recaptcha: "RecaptchaV2TaskProxyless",
  turnstile: "TurnstileTaskProxyless",
};

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} from ${url}`);
  return (await res.json()) as Record<string, unknown>;
}

/** Solve a captcha task and return the response token, or throw on failure. */
export async function solveToken(cfg: CaptchaConfig, task: CaptchaTask): Promise<string> {
  const base = cfg.baseUrl ?? BASE_URL[cfg.provider];
  const created = await postJson(`${base}/createTask`, {
    clientKey: cfg.apiKey,
    task: { type: TASK_TYPE[task.kind], websiteURL: task.websiteURL, websiteKey: task.websiteKey },
  });
  if (created.errorId) throw new Error(`createTask failed: ${created.errorCode ?? created.errorId}`);
  const { taskId } = created;
  const deadline = Date.now() + (cfg.timeoutMs ?? 180_000);
  const pollMs = cfg.pollMs ?? 5_000;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const result = await postJson(`${base}/getTaskResult`, { clientKey: cfg.apiKey, taskId });
    if (result.errorId) throw new Error(`getTaskResult failed: ${result.errorCode ?? result.errorId}`);
    if (result.status === "ready") {
      const solution = result.solution as { gRecaptchaResponse?: string; token?: string } | undefined;
      const token = solution?.gRecaptchaResponse ?? solution?.token;
      if (!token) throw new Error("captcha solution missing token");
      return token;
    }
  }
  throw new Error("captcha solve timed out");
}
