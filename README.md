# fuse-browser

Agentic browser for AI agents — an **MCP server** and **CLI** on top of
[Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright-nodejs) (stealth) with a
Playwright fallback.

It gives an LLM a **real browser** with: per-country identity (locale/currency/timezone/geo),
stealth, self-healing actions, an accessibility-style snapshot with stable refs,
multi-step plans, semantic waits, structured extraction, and **human guardrails** for
payments and bookings. Because it drives a real Chromium, it reads **Next.js / SPA**
pages after hydration — not just static HTML.

TypeScript port of the original Python `fusengine-browser-agent`, redesigned around the
official MCP SDK with a persistent session model, image-content screenshots, and a
swappable engine layer (Playwright / Patchright / CDP attach).

## Quick start (Claude Code / any MCP client)

```bash
# 1. register the published server (user scope = all projects)
claude mcp add fuse-browser --scope user -- npx -y @fusengine/browser-mcp
```

```jsonc
// or add it manually to your MCP config:
{ "mcpServers": {
  "fuse-browser": { "command": "npx", "args": ["-y", "@fusengine/browser-mcp"] }
}}
```

Then just ask your agent in natural language — it drives the browser via the tools:

> "Find a hotel in Annemasse this Friday under CHF 100."
> "What's my Google rank for 'agence web vevey' (CH)?"
> "Screenshot localhost:3000 in mobile and desktop."

## How it works

An LLM agent runs a **perceive → decide → act** loop through the MCP tools:

1. `browser_open` → a real (stealth) browser session
2. `browser_navigate` → load the page (JS/SPA rendered, animations settled)
3. `browser_snapshot` → indexed interactive elements with `ref` + form state
   (value, placeholder, options, checked, disabled, combobox `aria-*`, occlusion)
4. `browser_act` → click / fill / select / **pick** (autocomplete) a `ref`; returns a page diff
5. `browser_wait_for` → wait on a real condition, then loop back to snapshot
6. `browser_extract` / `browser_screenshot` → structured data or vision

Guardrails block pay/book/checkout unless the agent passes `humanApproved`.

## Requirements

- Node.js >= 20 (runtime). Bun is the dev toolchain.
- Chromium is **installed automatically** on `npm install` (soft postinstall).
  To install it manually or in CI:

```bash
npx patchright install chromium   # stealth engine (default)
npx playwright install chromium    # fallback engine
```

## Three ways to get a browser

| Mode | How | Use |
| --- | --- | --- |
| **Bundled** | default | Downloaded stealth Chromium (Patchright) |
| **Installed** | `channel: "chrome" \| "msedge"` | The Chrome/Edge installed on the machine |
| **Attach (CDP)** | `cdpEndpoint` or `browser_connect` | Drive an already-running browser — **Chrome, Edge, Dia, Arc, Brave** — using the user's real session |

`browser_connect` launches an installed browser with a remote-debugging port and attaches
to it automatically. Verified end-to-end against **Dia** (Chromium 148).

## CLI

Install the binaries once: `npm i -g @fusengine/browser-mcp` (provides `fuse-browser` + `browser-mcp`). Then:

```bash
# One-shot probe of a real page
fuse-browser probe https://example.com --extract-prices --observe-visual

# HTTP fast-path — browser TLS impersonation, NO browser launch (~10x faster)
# For server-rendered HTML (price lists, indexes). Falls back to probe for JS/SPA.
fuse-browser fetch https://books.toscrape.com/ --extract-prices --proxy http://user:pass@host:port

# Hotels with country identity, proxy routing, replay
fuse-browser probe 'https://www.booking.com/searchresults.html?ss=Tokyo' \
  --country JP --proxy-map proxies.json --replay --auto-consent --extract-prices

# Use the installed Chrome
fuse-browser probe https://example.com --channel chrome

# SEO rank tracking across many keywords (one session)
fuse-browser serp-batch "agence web vevey" "création site web lausanne" \
  --rank-domain fusengine.ch --serp-pages 2 --hl fr --gl ch

# Responsive screenshots (saved PNGs) — works on localhost too
fuse-browser shots http://localhost:8000 --viewports mobile,desktop,1280x720
```

Sensitive actions (`pay`, `book`, `checkout`, `confirm`, …) are **blocked** unless
`--approved` is passed.

## MCP server

```json
{
  "mcpServers": {
    "fuse-browser": { "command": "npx", "args": ["-y", "@fusengine/browser-mcp"] }
  }
}
```

### Default browser via env

By default the server uses the bundled stealth Chromium. To pin a different
default **for every tool call** (without the agent specifying it each time), set
`FUSE_*` env vars in the MCP config — an explicit per-call argument still wins:

```json
{
  "mcpServers": {
    "fuse-browser": {
      "command": "npx",
      "args": ["-y", "@fusengine/browser-mcp"],
      "env": { "FUSE_CHANNEL": "chrome", "FUSE_CDP_ENDPOINT": "http://localhost:9222" }
    }
  }
}
```

Supported: `FUSE_ENGINE`, `FUSE_CHANNEL`, `FUSE_CDP_ENDPOINT`, `FUSE_EXECUTABLE_PATH`,
`FUSE_HEADLESS`, `FUSE_COUNTRY`, `FUSE_CURRENCY`, `FUSE_USER_DATA_DIR`,
`FUSE_STORAGE_STATE`, `FUSE_OUTPUT_DIR`.

### Tools (25)

| Group | Tools |
| --- | --- |
| **One-shot** | `browser_probe`, `browser_probe_html` |
| **Fast-path** | `browser_fetch` — HTTP fetch with browser TLS/HTTP2 impersonation, **no browser launch** (~10× faster) for server-rendered HTML |
| **Session** | `browser_open`, `browser_connect`, `browser_status`, `browser_close` |
| **Navigate** | `browser_navigate`, `browser_back`, `browser_forward`, `browser_wait`, `browser_wait_for` |
| **Act** | `browser_click`, `browser_fill`, `browser_login`, `browser_scroll`, `browser_press`, `browser_select` |
| **Agentic** | `browser_snapshot` (indexed refs), `browser_act` (by ref + page diff), `browser_run` (multi-step plan) |
| **Extract** | `browser_extract` (text/prices/hotels/challenges), `browser_extract_schema` (typed, by CSS selectors) |
| **SERP** | `browser_serp_batch` — multi-query Google search in one session, per-query organic results + domain rank |
| **Vision** | `browser_screenshot` (page, single element by `ref`, or responsive set via `viewport`/`viewports`) |

Key agentic patterns:

- **`browser_snapshot` → `browser_act`** — snapshot tags each interactive element with a
  stable `ref`; act on a `ref` deterministically (or by text fallback). `browser_act`
  returns a **diff** of what changed (added/removed/text/url).
- **`browser_wait_for`** — wait on a condition (`text` / `selector` / `gone` / `urlContains`),
  not a fixed delay.
- **`browser_run`** — execute an ordered plan (navigate/act/wait/extract) in one call,
  stopping at the first failure. Guardrails apply to the whole plan.

- **`browser_fetch`** — when a page is server-rendered (price lists, indexes, docs),
  skip the browser entirely: `impit` impersonates a real Chrome TLS/JA3 + HTTP2
  fingerprint, `linkedom` extracts the text, and the same price extractor runs on it.
  ~10× faster and far lighter. Passes static HTML and low/medium Cloudflare; for JS
  challenges, Turnstile, DataDome or SPA content, fall back to `browser_probe`.

A `runs` resource exposes the JSON reports and screenshots written under the output dir
(see *Output & data location*).

## Library

```ts
import { BrowserAgent } from "@fusengine/browser-mcp";

const agent = new BrowserAgent({ countryCode: "CH", engine: "patchright" });
const report = await agent.probe("https://example.com", { extractPrices: true });
```

## Development

```bash
bun install
bun run typecheck       # tsc strict, no emit
bun test tests/unit     # pure unit tests
bun run test:integration # real headless Chromium + MCP in-process
bun run build           # emit dist/ (JS + .d.ts)
```

CI (`.github/workflows/ci.yml`) runs typecheck + unit + build + integration on every push.

## Output & data location

Artifacts (reports, screenshots, site-memory, replay) are written **outside the repo by default**:

- nested under the detected host-agent config dir when present —
  `.claude/fuse-browser/`, `.cursor/`, `.codex/`, `.windsurf/`, `.gemini/`, `.continue/`, `.junie/`, `.github/`;
- otherwise `~/.fuse-browser/`.

Override per run with `outputDir` (library / MCP arg) or `--output-dir` (CLI). Cookies
(`storageStatePath`) and the Chromium profile (`userDataDir`) are separate paths you set explicitly.

> ⚠️ Reports and `storage-state` files contain page content, screenshots and **session cookies in
> clear text** — never commit them. The bundled `.gitignore` already excludes the defaults.

## Guardrails & limits

- No payment/booking/ticketing/card action without explicit human approval.
- Passwords masked in reports; proxy credentials redacted.
- CAPTCHA / 2FA: detection by default; an **opt-in** solver is available for authorized testing only — see *Resilience & captcha*.
- Concurrent sessions are capped (`maxSessions`, default 8) to avoid OOM.
- CDP attach: the remote-debugging port is a local attack surface — use a dedicated profile.

## Resilience & captcha

- **Navigation retry** (on by default): transient failures and HTTP `429/502/503/504`
  are retried with full-jitter exponential backoff, honoring `Retry-After`. Tune via
  `retry: { maxAttempts, baseMs, capMs, throttleMs }` (defaults `3 / 300 / 10000 / 0`).
  `throttleMs` enforces a minimum gap between hits on the same host.
- **Captcha solver** (off by default, **opt-in**): set `solveCaptcha: true` on a probe and
  provide `captcha: { provider, apiKey }` (`2captcha` | `anticaptcha` | `capmonster`). It
  solves reCAPTCHA v2 / Cloudflare Turnstile via the provider's API; the result is reported
  as `captcha: { attempted, solved, kind, provider, reason }`. Failures are reported, never thrown.
- **Google SERP** (opt-in): set `extractSerp: true` on a probe of a Google results page →
  structured `serp: { organic[], ads[], related[] }` (title, url, displayUrl, snippet) in the report.
  Add `serpPages: N` to aggregate N pages (`start=0,10,…`) and `rankDomain: "example.com"` to get
  `serp.rank` (organic/ads positions + best) — a built-in rank tracker.
  CLI: `--extract-serp --serp-pages 2 --rank-domain example.com`.

## Proxies & anti-bot (scale)

Provide a proxy **pool** and the server rotates across it, retiring a proxy on block:

- `FUSE_PROXIES` env (comma/newline list) or `proxiesPath` (JSON array file) — used when no
  explicit `proxyUrl` / country-map proxy applies. Round-robin; a proxy that triggers a
  captcha/Cloudflare challenge is put on a 5-min cooldown and skipped (**auto-retire**).
- **WebRTC leak guard**: when a proxy is set (Chromium), launch args force WebRTC through the
  proxy so the real IP can't leak via ICE/STUN.
- Residential/mobile proxies are what actually beat industrial anti-bot at volume (paid). The
  proxy list is a secret — keep it out of the repo (`proxies.json` is git-ignored).

## Disclaimer

Provided **as-is** under MIT, with no warranty. `fuse-browser` is a neutral, dual-use
automation tool. **You alone are responsible** for how you use it and for complying with
applicable law, the target sites' Terms of Service, `robots.txt`, and data-protection rules
(e.g. GDPR). The opt-in captcha solver is intended for **authorized testing only** — on
systems you own or are explicitly permitted to test.

## License

MIT
