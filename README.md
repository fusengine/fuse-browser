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

## Requirements

- Node.js >= 20 (runtime). Bun is the dev toolchain.
- A Chromium build for the bundled engine:

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

```bash
# One-shot probe of a real page
npx fuse-browser probe https://example.com --extract-prices --observe-visual

# Hotels with country identity, proxy routing, replay
npx fuse-browser probe 'https://www.booking.com/searchresults.html?ss=Tokyo' \
  --country JP --proxy-map proxies.json --replay --auto-consent --extract-prices

# Use the installed Chrome
npx fuse-browser probe https://example.com --channel chrome
```

Sensitive actions (`pay`, `book`, `checkout`, `confirm`, …) are **blocked** unless
`--approved` is passed.

## MCP server

```json
{
  "mcpServers": {
    "fuse-browser": { "command": "npx", "args": ["fuse-browser-mcp"] }
  }
}
```

### Tools (23)

| Group | Tools |
| --- | --- |
| **One-shot** | `browser_probe`, `browser_probe_html` |
| **Session** | `browser_open`, `browser_connect`, `browser_status`, `browser_close` |
| **Navigate** | `browser_navigate`, `browser_back`, `browser_forward`, `browser_wait`, `browser_wait_for` |
| **Act** | `browser_click`, `browser_fill`, `browser_login`, `browser_scroll`, `browser_press`, `browser_select` |
| **Agentic** | `browser_snapshot` (indexed refs), `browser_act` (by ref + page diff), `browser_run` (multi-step plan) |
| **Extract** | `browser_extract` (text/prices/hotels/challenges), `browser_extract_schema` (typed, by CSS selectors) |
| **Vision** | `browser_screenshot` (page or single element by `ref`) |

Key agentic patterns:

- **`browser_snapshot` → `browser_act`** — snapshot tags each interactive element with a
  stable `ref`; act on a `ref` deterministically (or by text fallback). `browser_act`
  returns a **diff** of what changed (added/removed/text/url).
- **`browser_wait_for`** — wait on a condition (`text` / `selector` / `gone` / `urlContains`),
  not a fixed delay.
- **`browser_run`** — execute an ordered plan (navigate/act/wait/extract) in one call,
  stopping at the first failure. Guardrails apply to the whole plan.

A `runs` resource exposes the JSON reports and screenshots written under `runs/`.

## Library

```ts
import { BrowserAgent } from "fuse-browser";

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

## Guardrails & limits

- No payment/booking/ticketing/card action without explicit human approval.
- Passwords masked in reports; proxy credentials redacted.
- CAPTCHA / 2FA: detection + human handoff, never a magic bypass.
- Concurrent sessions are capped (`maxSessions`, default 8) to avoid OOM.
- CDP attach: the remote-debugging port is a local attack surface — use a dedicated profile.

## License

MIT
