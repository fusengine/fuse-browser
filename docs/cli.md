# CLI

`fuse-browser` is a command-line front-end for the browser agent. It exposes four subcommands that all share a single flag parser (`node:util` `parseArgs`, strict mode), so any flag is accepted globally but only consumed by the subcommands documented below.

```
fuse-browser probe <url> [flags]
fuse-browser fetch <url> [--extract-prices] [--proxy <url>]
fuse-browser serp-batch <query...> --rank-domain <domain> [flags]
fuse-browser shots <url> [--viewports mobile,desktop] [flags]
```

Output is JSON on stdout for every subcommand except `serp-batch --csv` (CSV). Guardrail-blocked probes print `BLOCKED: ...` to stderr and exit with code `2`. Invalid usage exits `1`.

---

## `probe <url>`

Runs one full agent probe against `url` (navigation, optional consent handling, optional extraction passes, optional scripted actions) and prints a compact JSON report.

```bash
fuse-browser probe https://example.com --extract-prices --observe-visual
```

Scripted actions are built from repeatable flags and run in order: all `--fill TARGET=VALUE` first, then all `--click TARGET`. A `--fill` value without `=` exits `1` with `--fill must be TARGET=VALUE`.

Applicable flags: `--engine`, `--country`, `--currency`, `--headed`, `--auto-consent`, `--extract-prices`, `--detect-challenges`, `--observe-visual`, `--extract-serp`, `--serp-pages`, `--rank-domain`, `--human-mode`, `--approved`, `--replay`, `--wait-ms`, `--output-dir`, `--storage-state`, `--proxy`, `--proxy-map`, `--user-data-dir`, `--site-memory-dir`, `--click`, `--fill`.

## `fetch <url>`

HTTP fast-path fetch using TLS impersonation (no full browser). Returns `status`, `url`, the response body truncated to the first 20,000 characters, and optional extracted prices. HTML is rendered to markdown by default; non-HTML responses (JSON, `text/plain`) are returned verbatim. The body download is capped at 10 MB. Pass `--browser-fallback` to re-render an empty SPA/CSR shell in a real browser (`escalated: true` in the output).

```bash
fuse-browser fetch https://example.com --extract-prices --proxy http://user:pass@host:8080
fuse-browser fetch https://app.example.com --browser-fallback   # render a client-side app
```

Applicable flags: `--proxy`, `--extract-prices`, `--browser-fallback`, `--text`, `--format <markdown|text>`.

## `serp-batch <queries...>`

Runs one Google search per query and prints one row per query. Requires at least one query (otherwise exits `1`). Output is JSON by default, or CSV with `--csv`.

```bash
fuse-browser serp-batch "best running shoes" "trail shoes" \
  --rank-domain example.com --serp-pages 2 --csv > ranks.csv
```

Applicable flags: `--engine`, `--country`, `--headed`, `--output-dir`, `--proxy`, `--rank-domain`, `--serp-pages`, `--hl`, `--gl`, `--delay-ms`, `--csv`.

## `shots <url>`

Captures responsive screenshots of `url` to disk and prints the saved-shot metadata as JSON. Viewports come from `--viewports` (defaults to `mobile,desktop`). Each entry is either a preset (`mobile`, `tablet`, `desktop`) or `WIDTHxHEIGHT` (e.g. `1280x720`); unrecognized entries fall back to `desktop`.

```bash
fuse-browser shots https://example.com --viewports mobile,tablet,1280x720 --settle-ms 800
```

Applicable flags: `--engine`, `--country`, `--headed`, `--output-dir`, `--viewports`, `--settle-ms`.

---

## Approval guardrail

Sensitive actions (pay / book / checkout / confirm) are blocked unless `--approved` is passed. When blocked, `probe` prints `BLOCKED: <reason>` to stderr and exits `2`. `--approved` sets the `humanApproved` flag on the probe.

---

## Flags

| Flag | Type | Description |
|------|------|-------------|
| `--engine` | string | Engine/browser name to launch (probe, serp-batch, shots). |
| `--country` | string | Country code for geo/locale context (probe, serp-batch, shots). |
| `--currency` | string | Currency context for the probe (probe). |
| `--headed` | boolean | Run with a visible browser; absent means headless. |
| `--auto-consent` | boolean | Automatically handle cookie/consent dialogs (probe). |
| `--extract-prices` | boolean | Extract prices from the page (probe, fetch). |
| `--browser-fallback` | boolean | Re-render an empty SPA/CSR shell in a real browser (fetch). |
| `--text` | boolean | Return raw text instead of markdown (fetch). |
| `--format` | string | Output format `markdown` or `text` (fetch). |
| `--detect-challenges` | boolean | Detect anti-bot / challenge pages (probe). |
| `--observe-visual` | boolean | Run the visual observation pass (probe). |
| `--extract-serp` | boolean | Extract SERP results from the page (probe). |
| `--serp-pages` | string | Number of SERP pages to process; parsed as a number (probe, serp-batch). |
| `--rank-domain` | string | Domain to find/rank within SERP results (probe, serp-batch). |
| `--csv` | boolean | Emit `serp-batch` output as CSV instead of JSON (serp-batch). |
| `--viewports` | string | Comma-separated viewports for `shots`: presets `mobile`/`tablet`/`desktop` or `WIDTHxHEIGHT`. Defaults to `mobile,desktop` (shots). |
| `--settle-ms` | string | Milliseconds to wait before capturing screenshots; parsed as a number (shots). |
| `--hl` | string | Google `hl` interface-language parameter (serp-batch). |
| `--gl` | string | Google `gl` geolocation parameter (serp-batch). |
| `--delay-ms` | string | Delay between queries; parsed as a number (serp-batch). |
| `--human-mode` | boolean | Enable human-like interaction behavior (probe). |
| `--approved` | boolean | Authorize sensitive actions (pay/book/checkout/confirm) (probe). |
| `--replay` | boolean | Enable replay of recorded interactions (probe). |
| `--wait-ms` | string | Extra wait after load; parsed as a number, defaults to `0` (probe). |
| `--output-dir` | string | Directory for output artifacts (probe, serp-batch, shots). |
| `--storage-state` | string | Path to a Playwright storage-state file for session reuse (probe). |
| `--proxy` | string | Proxy URL for all requests (probe, fetch, serp-batch). |
| `--proxy-map` | string | Path to a per-domain proxy mapping file (probe). |
| `--user-data-dir` | string | Persistent browser user-data directory (probe). |
| `--site-memory-dir` | string | Directory for per-site memory (probe). |
| `--click` | string (repeatable) | Click the given target; repeat for multiple clicks, run after all `--fill` (probe). |
| `--fill` | string (repeatable) | Fill a field as `TARGET=VALUE`; repeatable, run before clicks (probe). |

> **Note:** `--channel` is **not** a recognized flag in the current CLI (`src/bin/cli.ts`). Because `parseArgs` runs in strict mode, passing it will cause an "unknown option" error. It is documented here only to record its absence.

---

## More examples

Probe with price + visual extraction:

```bash
fuse-browser probe https://shop.example.com/product/42 --extract-prices --observe-visual
```

Fetch fast-path (no browser):

```bash
fuse-browser fetch https://example.com/api/page --extract-prices
```

SERP batch ranks to CSV:

```bash
fuse-browser serp-batch "wireless earbuds" "noise cancelling earbuds" \
  --rank-domain example.com --csv > ranks.csv
```

Responsive screenshots:

```bash
fuse-browser shots https://example.com --viewports mobile,tablet,desktop --settle-ms 500
```

Booking flow with geo proxy and replay (sensitive, hence `--approved`):

```bash
fuse-browser probe https://booking.example.com \
  --country JP --proxy-map ./proxies.json --replay \
  --fill "checkin=2026-07-01" --click "Search" --approved
```
