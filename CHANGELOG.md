# Changelog

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
