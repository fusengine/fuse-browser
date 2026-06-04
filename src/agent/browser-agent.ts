/**
 * High-level agentic browser facade: guardrails + probe orchestration.
 * @module agent/browser-agent
 */
import { preflight, type PreflightResult } from "../guardrails/preflight.js";
import type { ProbeReport } from "../interfaces/report.js";
import type { AgentOptions, BrowserAction, ProbeOptions } from "../interfaces/types.js";
import { BudgetExhaustedError, CircuitOpenError, GuardrailViolation, QueueFullError } from "../lib/errors.js";
import {
  recordBreakerReject,
  recordBudgetReject,
  recordProbeFailed,
  recordProbeOk,
  recordQueueReject,
} from "../net/metrics.js";
import { withQueue } from "../net/queue-guard.js";
import { resolveConfig, type ResolvedConfig } from "./config.js";
import { tryFastContacts } from "./fast-contacts.js";
import { runProbe } from "./probe-run.js";

/** Lightweight browser agent on top of Patchright/Playwright. */
export class BrowserAgent {
  /** Effective resolved configuration. */
  readonly config: ResolvedConfig;

  constructor(opts: AgentOptions = {}) {
    this.config = resolveConfig(opts);
  }

  /** Check whether the given actions are allowed without human approval. */
  preflight(actions: BrowserAction[], humanApproved = false): PreflightResult {
    return preflight(actions, humanApproved);
  }

  /**
   * Probe a real URL: enforce guardrails then run the browser pipeline.
   * @throws {GuardrailViolation} when a sensitive action lacks approval.
   */
  async probe(url: string, options: ProbeOptions = {}): Promise<ProbeReport> {
    const pf = preflight(options.actions ?? [], options.humanApproved ?? false);
    if (!pf.allowed) throw new GuardrailViolation(pf.reason, pf.blockedActions);
    const fast = await tryFastContacts(this.config, url, options);
    if (fast) return fast;
    return this.runBrowserProbe(url, options);
  }

  /** Gate the browser probe by the queue/budget and record metrics. */
  private async runBrowserProbe(url: string, options: ProbeOptions): Promise<ProbeReport> {
    const start = Date.now();
    try {
      const report = await withQueue(this.config.probeQueue, () => runProbe(this.config, url, options));
      recordProbeOk(Date.now() - start);
      return report;
    } catch (err) {
      if (err instanceof CircuitOpenError) recordBreakerReject();
      else if (err instanceof QueueFullError) recordQueueReject();
      else if (err instanceof BudgetExhaustedError) recordBudgetReject();
      else recordProbeFailed(Date.now() - start);
      throw err;
    }
  }

  /** Probe an inline HTML fixture via a base64 data URL. */
  async probeHtml(html: string, options: ProbeOptions = {}): Promise<ProbeReport> {
    const dataUrl = `data:text/html;charset=utf-8;base64,${Buffer.from(html).toString("base64")}`;
    return this.probe(dataUrl, options);
  }
}
