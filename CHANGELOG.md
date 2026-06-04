# Changelog

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
