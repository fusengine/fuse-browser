# Changelog

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
