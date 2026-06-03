/**
 * High-level agentic browser facade: guardrails + probe orchestration.
 * @module agent/browser-agent
 */
import { preflight, type PreflightResult } from "../guardrails/preflight.js";
import type { ProbeReport } from "../interfaces/report.js";
import type { AgentOptions, BrowserAction, ProbeOptions } from "../interfaces/types.js";
import { GuardrailViolation } from "../lib/errors.js";
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
    return (await tryFastContacts(this.config, url, options)) ?? runProbe(this.config, url, options);
  }

  /** Probe an inline HTML fixture via a base64 data URL. */
  async probeHtml(html: string, options: ProbeOptions = {}): Promise<ProbeReport> {
    const dataUrl = `data:text/html;charset=utf-8;base64,${Buffer.from(html).toString("base64")}`;
    return this.probe(dataUrl, options);
  }
}
