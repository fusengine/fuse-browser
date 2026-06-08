# Changelog

## [0.1.46] - 08-06-2026

### Added

- feat(collect): **`browser_collect_batch`** (MCP) / **`collect-batch <url...>`** (CLI) — the collect side of **crawl + collect**. Exhausts the infinite-scroll / paginated list of many listing URLs in parallel: one real browser per URL, drains each page (scroll + dedup by row key), returns all items. Low concurrency (default 2), jittered per-host throttle, per-URL error isolation. Pair with `browser_crawl` to discover category/search pages, then drain each here → ratisser a whole classifieds/listing site. New one-shot `runCollect(config, url, opts)` (browser counterpart of a single fetch) reused by the batch. 36th tool.

## [0.1.45] - 08-06-2026

### Added

- feat(crawl): **per-host throttle with jitter** — `browser_crawl` spaces requests to the same host by `throttleMs` (MCP) / `--throttle-ms` (CLI), default **250 ms** (`0` disables). The delay is **jittered per request** (uniform in `[base/2, base*1.5]`, via new `jitterMs`) — a fixed gap is a bot fingerprint, so the pacing oscillates to look human. Keeps big crawls (50-100 URLs) polite and avoids "unusual traffic"/rate-limit blocks.

### Changed

- fix(throttle): `throttleHost` now **reserves the next slot synchronously** (before awaiting), so N concurrent callers on the same host are correctly spaced by `minGapMs` instead of bursting together (the prior check-then-set-after-sleep let concurrent callers read the same timestamp and fire at once). Sequential callers behave identically. Benefits both the crawl and the browser probe path.

## [0.1.44] - 08-06-2026

### Added

- feat(shots): **`browser_shots_batch`** (MCP) / **`shots-batch <url...>`** (CLI) — full-page responsive screenshots for many URLs in parallel, the visual counterpart of `browser_fetch_batch`. Each URL is rendered in a real browser at each viewport (default `mobile,desktop`) and saved as a PNG; concurrency is **low by default (2)** since every page is a full Chromium instance. Returns saved paths per URL; a failed URL becomes `{ url, error }` without aborting the batch. 35th tool.

### Changed

- refactor(viewport): `parseViewports` (CSV → viewport inputs) moved to `engine/viewport.ts` and shared by the `shots` and `shots-batch` CLIs (removes duplication).

## [0.1.43] - 08-06-2026

### Added

- feat(crawl): **`browser_crawl`** (MCP) / **`crawl <url>`** (CLI) — bounded same-origin crawl from a seed URL via the HTTP fast-path. Breadth-first, fetching each depth level in parallel, returning clean markdown per page (with its `depth`). Reuses the fast-path + per-page SPA `browserFallback` + the bounded-concurrency map. Conservative defaults: `maxPages` 25, `maxDepth` 2, `concurrency` 5, `sameOrigin` true, and **`respectRobots` true** (robots.txt honored by default; opt out with `respectRobots:false` / `--no-robots`). URLs are de-duplicated at enqueue time and hash fragments are stripped. New `net/extract-links.ts` (same-origin link extraction). 34th tool.

## [0.1.42] - 08-06-2026

### Added

- feat(cli): both bins handle `--help`/`-h` and `--version`/`-v` **before** strict arg parsing (and, for `browser-mcp`, before the stdio transport binds — printing to stdout after connect would corrupt the protocol). Unknown top-level flags now produce a concise `error: Unknown option '…'` (exit 1) instead of a raw `ERR_PARSE_ARGS_UNKNOWN_OPTION` stack trace. Logic lives in a shared `bin/cli-meta.ts` helper (`handleMetaFlags`, `parseArgsOrExit`, `firstFlag`).

## [0.1.41] - 08-06-2026

### Added

- feat(fetch): **`browser_fetch_batch`** (MCP) / **`fetch-batch <url...>`** (CLI) — fetch many URLs in parallel via the HTTP fast-path, bounded concurrency (default 8). Each URL keeps full `browser_fetch` semantics (markdown for HTML, JSON/plain-text verbatim, per-URL `browserFallback` SPA escalation). Results are returned in input order; a failed URL becomes `{ url, error }` and never aborts the batch. Lets an agent retrieve N pages in one call instead of N round-trips. CLI flag `--concurrency`.

### Changed

- refactor(fetch): extracted the shared body→`{ format, text, escalated }` rendering into `agent/fetch-render.ts` (`renderFetch`), now the single source used by `browser_fetch`, the `fetch` CLI, and `browser_fetch_batch` (removes the prior duplication). New `net/concurrent.ts` (`mapConcurrent`) is a dependency-free, order-preserving, error-isolating bounded-concurrency map.

## [0.1.40] - 08-06-2026

### Added

- feat(fetch): **`browserFallback`** (MCP) / **`--browser-fallback`** (CLI) on `browser_fetch` — opt-in escalation so a single call can "see everything". When the HTTP fast-path returns an unrendered client-side shell (SPA/CSR), it transparently re-renders the page in a real browser (Patchright, reusing the `browser_probe` pipeline) and returns the rendered markdown. Off by default — the fast-path stays fast and predictable. Results carry `escalated: true` when a browser was used. Detection is conservative (thin **visible** text + SPA mount markers / heavy scripting), so server-rendered pages (Next.js SSG/SSR, Nuxt, Astro, Remix, VitePress…) never pay the browser cost.
- feat(cli): the `fetch` subcommand now accepts `--text` and `--format <markdown|text>` (previously read by the handler but not registered, so unusable).

### Changed

- perf(fetch): the fast-path no longer parses HTML it doesn't need. `FastResponse.text` is now **lazy + memoized** — the linkedom text pass runs only when a consumer reads it, so the common markdown path (and the robots.txt path) skips a full parse.
- perf(serialize): `htmlToMarkdown` caps its input at `DEFAULT_MAX_INPUT_CHARS` (2 MB) before parsing — bounds parse cost on pathological pages.
- perf(fetch): the body download is **streamed with a 10 MB hard cap** (`readCappedText`), cancelling early instead of buffering unbounded payloads; the cap truncates on a clean UTF-8 boundary (no trailing `U+FFFD`).
- feat(fetch): requests send `Accept: text/markdown, text/html, …` — servers that serve native markdown (e.g. nuxt.com) are returned verbatim, skipping HTML→markdown entirely.

### Fixed

- fix(fetch): `htmlToText` no longer throws (and no longer returns empty) on **fragment / rootless** pages with no `<html>`/`<body>` — it falls back to a tag strip of the raw HTML, so visible text is always recovered.
- fix(fetch): thin-shell detection ignores inline `<script>` source (which `textContent` wrongly counts as text), so a bare SPA shell is correctly identified.

## [0.1.39] - 07-06-2026

### Fixed

- fix(fetch): the HTTP fast-path no longer mangles **non-HTML** responses. `fetchFast` now reads the `content-type` and, for anything that is not `text/html` / `application/xhtml+xml` (JSON APIs, `text/plain`, …), returns the body **verbatim** instead of running it through the linkedom HTML parser and Defuddle markdown pipeline. `browser_fetch` / the `fetch` CLI force raw `text` output for these bodies. As a bonus, `browser_fetch` is now usable as a fast **JSON-API** fetcher. An absent `content-type` is still treated as HTML (preserves prior behavior); the HTML happy path is unchanged. MIME matching uses an exact allowlist (not `includes("html")`) so payloads like `application/vnd.github.html+json` are correctly treated as non-HTML.

## [0.1.38] - 04-06-2026

### Added

- feat(live): **human live view** — `browser_live_view` / `browser_live_view_stop` (31st/32nd tools). A CDP screencast (`Page.startScreencast`, ack-per-frame, re-issued on navigation) streams JPEG frames over an ephemeral, token-gated `127.0.0.1` Server-Sent-Events server to a self-contained `<canvas>`/`<img>` viewer that auto-opens in the OS browser. Watch any session in real time — **works headless too**. Read-only; auto-closes on page close or stop; zero new dependencies. `broadcast()` is hardened against viewer mid-stream disconnects (no process crash on EPIPE/ECONNRESET).

## [0.1.37] - 04-06-2026

### Added

- feat(observability): **`browser_metrics`** tool (30th) — process-global scraping snapshot: probes ok/failed, avg/min/max probe duration, circuit-breaker/queue/budget rejects, live probe-queue depth (`running`/`admitted`/`waiting`), RSS and uptime. `reset:true` zeroes the counters after reading (job-scoped). Zero-dependency in-memory counters; only browser probes are counted (the HTTP fast-path is not), and resilience rejections are tracked distinctly from probe failures. Browser recycling was deemed N/A — the probe model is already ephemeral (fresh browser per probe), so there is no cross-probe memory growth to bound.

## [0.1.36] - 04-06-2026

### Added

- feat(resilience): opt-in **bounded probe queue + per-process budget** (`probeQueue` option, off by default). Caps concurrent **browser** probes (excess callers wait FIFO for a slot); a full waiting list fails fast with `Probe queue full …` (transient), and an optional `maxProbes` lifetime budget rejects further probes with `Probe budget exhausted …` (terminal). Only the browser path is gated — the HTTP fast-path bypasses the queue. Wired into `browser_probe`/`browser_probe_html`. Single-process, in-memory, zero-dependency. Defaults: 2 concurrent / 8 queued / unlimited budget.

## [0.1.35] - 04-06-2026

### Added

- feat(resilience): opt-in per-host **circuit breaker** for mass scraping (`circuitBreaker` option, off by default). After N consecutive thrown navigation failures on an origin, the circuit opens and further attempts fail fast for a cooldown (exponential reopen backoff, capped) instead of burning browser time on a dead host; a half-open trial after the cooldown closes on success or reopens. Wired into `browser_probe` (returns `Circuit open …`) and `browser_serp_batch` (per-query error row). HTTP 4xx/5xx/429 are returned responses, not throws, so they do not trip the breaker (429 stays a retry/`Retry-After` concern). Defaults: 5 failures / 30s / 10min cap.

## [0.1.34] - 04-06-2026

### Added

- feat(resilience): automatic crash recovery for live sessions. When a page crashes (or is closed) while its browser context is still alive, the next tool call transparently recreates the page in the **same context** — keeping cookies, `storageState` and auth — re-attaches listeners, re-applies HAR replay and re-navigates to the last URL. A lost browser/context evicts the session with a clear `session_lost: reopen with browser_open` error instead of an opaque exception. Default behavior unchanged on the happy path; no new tool or option.

## [0.1.33] - 04-06-2026

### Added

- feat(design): `browser_inspect({ sessionId, ref })` returns the computed styles, box model (content/padding/margin/border), typography, and resolved colors for any element by `ref`, plus the **WCAG 2.x contrast ratio** (text vs. effective background walked up the ancestor chain) with AA/AAA pass flags. Pure-Node contrast math; design-audit friendly. 29th MCP tool.

## [0.1.32] - 04-06-2026

### Added

- feat(vision): opt-in `annotate:true` on `browser_act` (re-marked Set-of-Marks frame of the new state, anti-drift) and `browser_screenshot` (SoM viewport frame). Default off (no behavior change).

## [0.1.31] - 04-06-2026

### Added

- feat(vision): opt-in `browser_snapshot({ annotate: true })` returns a Set-of-Marks JPEG — numbered badges (= each element's `ref`) drawn over the page — plus the refMap, so vision models (Claude/GPT-4o/Gemini) see the page and target by `ref`. Default off (no behavior change). Main-frame, viewport-only.

## [0.1.30] - 03-06-2026

### Added

- feat(probe): opt-in `fastPathFirst` cascade — with `extractContacts`, tries HTTP-only extraction first and skips the browser when the contact card is complete (email AND phone), escalating to a full browser probe + `contactCrawl` only when incomplete. Result carries `fastPath: true`. Default false (no behavior change). ~0.6s vs ~7s on static/SSR sites.

## [0.1.29] - 03-06-2026

### Added

- feat(fetch): `browser_fetch` and the `fetch` CLI accept `extractContacts` — structured contacts (emails, phones E.164, contact form) are extracted from the fetched HTML with no browser launch (~7s → ~0.6s on static/SSR sites). New `contactFilter` ("strict" default | "off") drops template placeholder emails and orders same-domain first; also exposed on `browser_probe`. Bounded haystack guards against ReDoS on hostile HTML.

## [0.1.28] - 03-06-2026

### Added

- feat(legal): opt-in `respectRobots` honors the origin's `robots.txt` (RFC 9309 matcher) — disallowed primary URL throws `RobotsDisallowed`, disallowed crawl links are skipped. Default false (blocks nothing). Added `LEGAL.md` (operator responsibility, GDPR/nLPD, opt-in levers) and GDPR hints on the contact MCP fields.

## [0.1.27] - 03-06-2026

### Added

- feat(mcp): `browser_probe` / `browser_probe_html` now accept `extractContacts`, `contactCrawl`, and the CDP-remote options `cdpHeaders` / `cdpCloseOnDone` / `cdpTimeoutMs`. `report.contacts` is included in the compact result. All optional — no behavior change when absent. Docs/tests use RFC 2606 example domains (no real PII).

## [0.1.26] - 03-06-2026

### Added

- feat(contacts): opt-in `probe({ extractContacts: true })` populates `report.contacts` (emails, phones in E.164 via libphonenumber-js, contact-form detection) from 3 deduped sources — mailto/tel hrefs, text+HTML regex, and deobfuscation ([at]/[dot], HTML entities, bounded bare spans). Opt-in `contactCrawl` follows same-domain contact/kontakt/impressum links (bounded) when the page has no email. No behavior change without the flags. See docs/recipes/prospection.md.

## [0.1.25] - 03-06-2026

### Fixed

- fix(probe): `BrowserAgent.probe()` now honors `cdpEndpoint` (attaches over CDP via `selectEngineForConfig`) and tears down via `teardownOpened`, so it never closes a user's attached browser. Previously it always launched a fresh browser and ignored `cdpEndpoint`. No behavior change when `cdpEndpoint` is unset.

## [0.1.24] - 03-06-2026

### Added

- feat(cdp): remote Browserless attach over `ws/wss` with `cdpHeaders` (or inline `?token=`) auth and configurable `cdpTimeoutMs`. Remote endpoints get a fresh identity-configured context closed on teardown (`cdpCloseOnDone`, default true for `ws/wss`); local CDP attach reuses the user's context and is never closed.
- feat(cdp): stealth parity on the CDP path — `addInitScript` re-injects `navigator.webdriver`/`languages` masks (a CDP-reached browser is already running and cannot be patched by Patchright). Launch path unchanged.

## [0.1.23] - 03-06-2026

### Added

- feat(fetch): `browser_fetch` and `browser_extract` (and the fetch CLI) now return clean LLM-ready markdown (main content + YAML frontmatter) by default, via a shared `defuddle`-based serialization layer. A `format: "markdown" | "text"` option preserves the previous raw-text behaviour.
