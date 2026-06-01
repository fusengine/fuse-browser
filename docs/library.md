# Library

`@fusengine/browser-mcp` can be used as a programmatic library, not just as a CLI or MCP server.

```bash
npm i @fusengine/browser-mcp
```

The package is **ESM-only** (`"type": "module"`) and ships TypeScript types (`dist/index.d.ts`). Use `import` syntax — `require()` is not supported. Node >= 20.

```ts
import { BrowserAgent } from "@fusengine/browser-mcp";
```

The public surface is intentionally small. Everything exported from the package entry (`src/index.ts`):

| Export | Kind | Summary |
| --- | --- | --- |
| `BrowserAgent` | class | High-level agentic browser facade (probe + guardrails). |
| `resolveConfig` | function | Normalize `AgentOptions` into a `ResolvedConfig`. |
| `SessionManager` | class | Live session lifecycle with TTL + concurrency cap. |
| `createServer` | function | Build the MCP server (tools + resources wired). |
| `compactReport` | function | Project a full report down to its operationally useful fields. |
| `ProbeReport` | type | Full report shape returned by `probe()`. |
| `AgentOptions`, `ProbeOptions`, `BrowserAction` | types | Construction / per-probe options and the action union. |
| `ResolvedConfig`, `BuiltServer` | types | Resolved config and built-server shapes. |

Anything not listed above (e.g. the snapshot/extraction/pipeline internals) is **not** part of the public API and may change without notice.

## BrowserAgent

Construct a `BrowserAgent` with [`AgentOptions`](./configuration.md) (engine, identity/country, proxy, HAR, replay, captcha, etc. — see the configuration reference for the full set), then call `probe()`.

```ts
import { BrowserAgent } from "@fusengine/browser-mcp";

const agent = new BrowserAgent({
  countryCode: "FR",       // per-country identity (locale/currency/timezone/geo)
  headless: true,
  engine: "patchright",    // stealth engine
});

const report = await agent.probe("https://example.com", {
  extractPrices: true,
  autoConsent: true,
  actions: [
    { type: "click", target: "Accept cookies" },
    { type: "wait", ms: 500 },
  ],
});

console.log(report.title, report.prices, report.identity.countryCode);
```

### Methods

| Method | Signature | Notes |
| --- | --- | --- |
| `constructor` | `new BrowserAgent(opts?: AgentOptions)` | Resolves and exposes `agent.config: ResolvedConfig`. |
| `probe` | `probe(url: string, options?: ProbeOptions): Promise<ProbeReport>` | Enforces guardrails, then runs the browser pipeline. Throws `GuardrailViolation` when a sensitive action lacks `humanApproved`. |
| `probeHtml` | `probeHtml(html: string, options?: ProbeOptions): Promise<ProbeReport>` | Probe an inline HTML fixture via a base64 `data:` URL. |
| `preflight` | `preflight(actions: BrowserAction[], humanApproved?: boolean): PreflightResult` | Check whether the given actions are allowed without human approval (no navigation). |

`BrowserAction` is a discriminated union on `type`: `click`, `fill`, `login`, `wait`.

`ProbeOptions` includes `actions`, `humanApproved`, `autoConsent`, `extractPrices`, `waitMs`, `detectChallenges`, `observeVisual`, `solveCaptcha`, `extractSerp`, `serpPages`, `rankDomain`.

### Report fields

`probe()` resolves to a `ProbeReport`. Key fields:

| Field | Type | Description |
| --- | --- | --- |
| `url`, `title` | `string` | Final URL and page title. |
| `realtime` | `boolean` | Whether content was rendered live. |
| `domChanged` | `boolean` | Whether actions mutated the DOM. |
| `text` | `string` | Extracted page text. |
| `prices` | `Price[]` | Detected prices (when `extractPrices`). |
| `hotelOffers` | `HotelOffers \| {}` | Travel/hotel offers when detected. |
| `challenges` | `Challenges \| {}` | Anti-bot / challenge detection (when `detectChallenges`). |
| `captcha` | `CaptchaOutcome?` | Captcha outcome (when `solveCaptcha`). |
| `serp` | `Serp?` | Structured Google SERP (when `extractSerp`); `serp.rank` populated by `rankDomain`. |
| `visual` | `Visual \| {}` | Visual observation (when `observeVisual`). |
| `consent` | `ConsentResult` | Cookie/consent handling result. |
| `currency` | `CurrencyResult` | Currency alignment result. |
| `identity` | `Identity` | Effective identity: country, locale, timezone, currency, geo, proxy status. |
| `actions` | `ActionResult[]` | Per-action outcomes. |
| `replay` | `{ enabled; steps; dir }` | Replay steps when replay is enabled. |
| `siteMemory` | `{ enabled; updated; filePath }` | Site-memory state. |
| `network`, `console` | arrays | Captured network entries and console messages. |
| `screenshotPath`, `reportPath` | `string` | On-disk artifact paths under the output dir. |
| `storageStatePath` | `string \| null` | Persisted storage state path, if any. |

Use `compactReport(report)` to get a smaller object with just the operationally useful fields (drops `network`/`console`/raw paths) — handy for logging or feeding to an LLM.

## Lower-level exports

Only these are public alongside `BrowserAgent`:

- **`resolveConfig(opts: AgentOptions): ResolvedConfig`** — Normalize raw `AgentOptions` into the effective `ResolvedConfig` (resolves identity, proxy, output dir, retry/captcha defaults). `BrowserAgent` calls this internally and exposes the result as `agent.config`; call it directly when you need the resolved config without constructing an agent.
- **`SessionManager`** — Manages live browser sessions with idle-TTL auto-close and a concurrent-session cap. Methods: `open(config)`, `get(id)`, `touch(id)`, `close(id)`, `closeAll()`, `list()`. Construct with `{ ttlMs?, maxSessions? }` (defaults `300_000` ms / `8`).
- **`createServer(): BuiltServer`** — Build the fuse-browser MCP server with every tool and resource registered. Returns `{ server, sessions }`. This is what the `browser-mcp` bin wires to a transport; use it to embed the MCP server in your own process.
- **`compactReport(report: ProbeReport): Record<string, unknown>`** — Compact projection of a full report (see above).

> Note: helpers such as price extraction, snapshots, and multi-step pipelines exist in the codebase but are **not** exported from the package entry. Drive them through `BrowserAgent.probe()` / `ProbeOptions` instead.

## Options and environment

Library options map 1:1 to the CLI flags and MCP/environment configuration. The same `AgentOptions`/`ProbeOptions` fields, defaults, and `FUSE_BROWSER_*` environment variables documented in [configuration.md](./configuration.md) apply to programmatic usage.
