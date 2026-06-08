# Roadmap — fuse-browser

Stealth, agentic browser MCP (+ CLI/lib) on Patchright/Playwright.
Status legend: ✅ done · 🟡 in progress · ⬜ planned.

## ✅ Shipped (v0.1.x)

- ✅ MCP server + CLI + library, 37 tools, double binary (`browser-mcp`, `fuse-browser`)
- ✅ Engines: Chromium (Patchright stealth) / Firefox / WebKit + CDP attach (drive a real browser)
- ✅ Remote CDP (Browserless): auth `cdpHeaders`/`?token=`, configurable timeout, fresh identity context + stealth re-injection (`addInitScript` parity with launch), `cdpCloseOnDone` closes remote sessions while never closing a local browser
- ✅ Per-country identity (locale / timezone / geo / currency), realistic profile
- ✅ Navigation resilience: retry + full-jitter backoff, `Retry-After`, per-host throttle
- ✅ Extraction: main text, multi-currency prices, hotel offers
- ✅ Contact extraction at HTTP speed (`browser_fetch` + opt-in `extractContacts`, ~0.6s) with `fastPathFirst` cascade on `probe` (HTTP first, browser only if the card is incomplete) and a placeholder/same-domain `contactFilter`
- ✅ Contact extraction (opt-in `extractContacts`): emails + phones (E.164 via libphonenumber-js) + contact-form detection from 3 deduped sources (mailto/tel hrefs, text/HTML regex, `[at]`/`[dot]`/entity deobfuscation), with an opt-in same-domain mini-crawler (`contactCrawl`) that hunts the Contact/Impressum page — see [docs/recipes/prospection.md](docs/recipes/prospection.md)
- ✅ Google SERP: structured organic/ads/related, multi-page aggregation, domain **rank tracker**, `browser_serp_batch`
- ✅ Agentic perception: enriched snapshot (value, placeholder, options, checked, disabled, combobox `aria-*`, occlusion)
- ✅ Cross-boundary snapshot: open **Shadow DOM** piercing + **iframe** traversal (same/cross-origin), frame-scoped refs (`"<frame>:<local>"`)
- ✅ Virtualized/infinite lists: `browser_collect` (auto-detect scroll container, incremental scroll + dedup until end) + container-targeted `browser_scroll`
- ✅ Action caching: durable CSS selectors per snapshot element (`selectors:true`, finder-style, rejects generated ids) + per-site winning-strategy memory wired into the act tools
- ✅ Rotating proxy pool + SessionPool (round-robin, auto-retire on block) + WebRTC leak guard
- ✅ HTTP fast-path (`browser_fetch`): browser TLS/JA3 impersonation via `impit`, no browser launch
- ✅ Agentic action: `browser_act` `pick` (combobox/autocomplete in one call)
- ✅ Responsive screenshots: multi-viewport + JS-animation settle (auto-scroll, `animations:disabled`)
- ✅ Captcha: detection + opt-in solver (2captcha/anti-captcha/capmonster) — provider HTTP path live, paid solve unverified
- ✅ Guardrails (no pay/book without `humanApproved`), safe-by-default output dir, env defaults (`FUSE_*`)
- ✅ Publish pipeline: CI tests + npm publish (provenance) + GitHub Release on tag

## 🟡 v0.2 — Anti-bot & scale

- ✅ **Rotating residential proxies + SessionPool** — auto-retire on block *(shipped 0.1.13)*
- ⬜ **Real captcha solve, validated** — end-to-end with a paid provider key (reCAPTCHA v2 / Turnstile) *(low effort once a key exists)*
- ✅ **HTTP fast-path with TLS/JA3 impersonation** (`impit`) — `browser_fetch`, no browser launch *(shipped 0.1.14)*
- ✅ **Warm browser pool / horizontal concurrency** — `BrowserPool`: one warm browser, fresh isolated context per task; drives shots-batch / collect-batch / site-shots (no cold-launch per URL) *(shipped 0.1.48)*

## ✅ v0.3 — Agentic robustness

- ❌ **CDP-disconnect during sensitive actions** — *won't fix (misconception)*: Playwright/Patchright **is** the CDP connection (dropping it = losing control), and the real signals (`Runtime.enable`, `navigator.webdriver`, injected scripts) are already neutralized at the source by Patchright. Residual hardening = residential proxies + timing + coherent profile, not CDP.
- ✅ **Action caching** — durable selectors + per-site strategy memory *(shipped 0.1.17)*
- ✅ **Shadow-DOM & iframe traversal** in the snapshot — modern date/airport pickers *(shipped 0.1.15)*
- ✅ **Scroll/virtualized-list hints** — `browser_collect` surfaces off-screen results *(shipped 0.1.16)*

## ✅ v0.4 — Design & data tooling

- ✅ **Visual diff** (`browser_visual_diff`) — pixel diff vs baseline + changed-region boxes (pixelmatch + fast-png) *(shipped 0.1.19)*
- ✅ **HAR record/replay** — `harPath`/`harMode` record (flushed on close), `harReplay` serves responses offline *(shipped 0.1.20)*
- ✅ **Extraction pipeline** — composable clean→validate→dedupe→emit (`pipeline` arg on `browser_collect`) *(shipped 0.1.21)*
- ✅ **CSV export** for SERP/rank batches — `serp-batch --csv` *(shipped 0.1.18)*

## ✅ v0.5 — Observability, live view & content acquisition

- ✅ **Metrics** (`browser_metrics`) — probe ok/failed, durations, breaker/queue/budget rejects, queue depth, RSS/uptime; `reset` *(shipped 0.1.37)*
- ✅ **Human live view** (`browser_live_view` / `_stop`) — CDP screencast streamed as JPEG over a token-gated localhost SSE viewer, works headless *(shipped 0.1.38)*
- ✅ **Non-HTML verbatim** — `browser_fetch` returns JSON/`text/plain` bodies raw (usable as a JSON-API fetcher) *(shipped 0.1.39)*
- ✅ **Fast-path perf & quality** — lazy `text`, 2 MB pre-parse cap, 10 MB streamed download cap (clean UTF-8 cut), `Accept: text/markdown` (native-markdown verbatim) *(shipped 0.1.40)*
- ✅ **SPA escalation** — opt-in `browserFallback`: an empty CSR shell is re-rendered in a real browser (`escalated:true`) *(shipped 0.1.40)*
- ✅ **Batch fetch** (`browser_fetch_batch`) — many URLs in parallel, bounded concurrency, per-URL error isolation *(shipped 0.1.41)*
- ✅ **CLI metadata flags** — `--help`/`--version` + clean unknown-flag errors on both bins *(shipped 0.1.42)*
- ✅ **Site crawl** (`browser_crawl`) — bounded same-origin BFS → markdown per page, robots-honored, reuses the batch/escalation path *(shipped 0.1.43)*
- ✅ **Batch screenshots** (`browser_shots_batch`) — responsive full-page PNGs for many URLs in parallel (visual counterpart of fetch-batch) *(shipped 0.1.44)*
- ✅ **Crawl per-host throttle (jittered)** — `throttleMs` (default 250ms, jittered `[base/2,1.5×]` to look human) + reserve-ahead `throttleHost` so big crawls stay polite/unblocked *(shipped 0.1.45)*
- ⬜ **Cross-request fetch cache** — optional byte-bounded LRU to skip repeat fetches across calls *(planned)*
- ✅ **Crawl + collect** — `browser_collect_batch`: exhaust the infinite list of many listing URLs in parallel (crawl discovers, collect drains) → ratisser a whole listing site *(shipped 0.1.46)*
- ✅ **Crawl → screenshots** (`browser_site_shots`) — crawl + screenshot each page: full-site **content + visual** snapshot in one flow (crawl markdown surfaced, not discarded) *(shipped 0.1.47)*

## ⬜ Later / optional

- ✅ **Human-in-the-loop** takeover — `browser_handoff` pauses for a human (headed) to finish login/2FA/captcha, resumes on a url/selector condition *(shipped 0.1.20)*; streaming **live view** later added (`browser_live_view`, JPEG-over-SSE, works headless) *(shipped 0.1.38)*
- ✅ Session persistence: auto-save `storageState` on `browser_close` (when `storageStatePath` set) *(shipped 0.1.20)*
- ⬜ Hosted endpoint (open-core) — managed sessions + proxies + scheduling *(product decision)*

## Known limits (today)

- Industrial anti-bot (aggressive Cloudflare Turnstile, DataDome, reCAPTCHA v2 image) needs residential proxies + a captcha solver.
- High request volume triggers "unusual traffic" without proxy rotation.
- Login/2FA needs your credentials or a CDP-attached logged-in session.
