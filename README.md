# fuse-browser

**Give your AI agent a real, stealth browser.** An [MCP](https://modelcontextprotocol.io)
server + CLI on top of [Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright-nodejs)
(stealth Chromium) with a Playwright fallback.

Your agent gets a **real browser** — per-country identity (locale/currency/timezone/geo),
stealth fingerprint, self-healing actions, an indexed snapshot with stable refs (piercing
Shadow DOM + iframes), multi-step plans, structured extraction, visual diff, and **human
guardrails** for payments and bookings. It drives real Chromium, so it reads **Next.js / SPA**
pages after hydration — not just static HTML.

> 32 MCP tools · stealth + rotating proxies · virtualized-list scraping · HAR record/replay · pixel visual-diff · human handoff + live view.

## Install

```bash
# Register with Claude Code (or any MCP client) — user scope = all projects
claude mcp add fuse-browser --scope user -- npx -y @fusengine/browser-mcp
```

```jsonc
// …or add it to your MCP config manually:
{ "mcpServers": {
  "fuse-browser": { "command": "npx", "args": ["-y", "@fusengine/browser-mcp"] }
}}
```

Chromium installs automatically. That's it — now just ask your agent in plain language:

> "Find a hotel in Annemasse this Friday under CHF 100."
> "What's my Google rank for 'agence web vevey' (CH)?"
> "Screenshot localhost:3000 in mobile and desktop."

Prefer a terminal? Install the CLI: `npm i -g @fusengine/browser-mcp`

```bash
fuse-browser probe https://example.com --extract-prices
fuse-browser fetch https://books.toscrape.com/ --extract-prices   # no browser, ~10× faster
```

## How it works

An LLM runs a **perceive → decide → act** loop through the tools: `browser_open` →
`browser_navigate` → `browser_snapshot` (indexed `ref`s + form state) → `browser_act`
(click/fill/select/pick, returns a page diff) → `browser_wait_for` → `browser_extract` /
`browser_screenshot`. Sensitive actions (pay / book / checkout) are **blocked** unless the
agent passes `humanApproved`.

## What you get

- **Stealth** — Patchright neutralizes the real automation signals; per-country identity + rotating proxy pool.
- **Agentic targeting** — accessibility-style snapshot with stable refs, self-healing click/fill, multi-step plans.
- **Vision (Set-of-Marks)** — `annotate:true` on `browser_snapshot`/`browser_act`/`browser_screenshot` draws numbered badges (= each `ref`) on the page, so vision models *see* it and target by ref.
- **Sees everything** — open Shadow DOM, same/cross-origin iframes, and **virtualized/infinite lists** (`browser_collect`).
- **Fast-path** — `browser_fetch` impersonates a real Chrome TLS fingerprint for server-rendered HTML, no browser launch — returns clean **markdown** and optional **contacts** (`extractContacts`) at ~HTTP speed. **JSON APIs / plain text** come back verbatim (no HTML mangling). Opt-in **`browserFallback`** auto-renders client-side (SPA/CSR) pages in a real browser when the HTTP response is an empty shell (`escalated: true`).
- **Data out** — multi-currency prices, typed CSS extraction, **contact extraction** (emails/phones E.164, `fastPathFirst` cascade), a clean→validate→dedupe→emit pipeline, CSV export, Google SERP rank tracking.
- **Ops** — persistent sessions, **auto crash recovery** (a crashed page is recreated in the same context and restored to its last URL between calls), opt-in **per-host circuit breaker** + **bounded probe queue/budget** + **`browser_metrics`** for mass scraping, **live view** (watch any session — even headless — in your browser), `storageState` auto-save, HAR record/replay, pixel `visual_diff`, human handoff for login/2FA.

## Documentation

Full reference in **[`docs/`](./docs/README.md)**:

[Installation](./docs/installation.md) ·
[CLI](./docs/cli.md) ·
[MCP tools (32)](./docs/mcp-tools.md) ·
[Configuration](./docs/configuration.md) ·
[Sessions](./docs/sessions.md) ·
[Extraction](./docs/extraction.md) ·
[Anti-bot & proxies](./docs/anti-bot.md) ·
[Library](./docs/library.md)

## Disclaimer

Provided **as-is** under MIT, no warranty. `fuse-browser` is a neutral, **dual-use** automation
tool built for **responsible automation**: sensitive actions (payment, booking, checkout,
destructive operations) are gated behind **human-approval guardrails**, and compliance controls —
`robots.txt` respect (`respectRobots`), rate limiting, contact-extraction filters — are built in
and **opt-in**, to be configured according to your lawful basis and the target's rules.
**You alone are responsible** for complying with applicable law, target sites' Terms of Service,
`robots.txt`, and data-protection rules (GDPR, nLPD). The opt-in captcha solver and contact
extraction are for **authorized, lawful use only**. See **[LEGAL.md](./LEGAL.md)**.

## License

MIT
