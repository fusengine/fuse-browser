# Roadmap — fuse-browser

Stealth, agentic browser MCP (+ CLI/lib) on Patchright/Playwright.
Status legend: ✅ done · 🟡 in progress · ⬜ planned.

## ✅ Shipped (v0.1.x)

- ✅ MCP server + CLI + library, 26 tools, double binary (`browser-mcp`, `fuse-browser`)
- ✅ Engines: Chromium (Patchright stealth) / Firefox / WebKit + CDP attach (drive a real browser)
- ✅ Per-country identity (locale / timezone / geo / currency), realistic profile
- ✅ Navigation resilience: retry + full-jitter backoff, `Retry-After`, per-host throttle
- ✅ Extraction: main text, multi-currency prices, hotel offers
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

## ⬜ v0.2 — Anti-bot & scale

- ✅ **Rotating residential proxies + SessionPool** — auto-retire on block *(shipped 0.1.13)*
- ⬜ **Real captcha solve, validated** — end-to-end with a paid provider key (reCAPTCHA v2 / Turnstile) *(low effort once a key exists)*
- ✅ **HTTP fast-path with TLS/JA3 impersonation** (`impit`) — `browser_fetch`, no browser launch *(shipped 0.1.14)*

## ⬜ v0.3 — Agentic robustness

- ❌ **CDP-disconnect during sensitive actions** — *won't fix (misconception)*: Playwright/Patchright **is** the CDP connection (dropping it = losing control), and the real signals (`Runtime.enable`, `navigator.webdriver`, injected scripts) are already neutralized at the source by Patchright. Residual hardening = residential proxies + timing + coherent profile, not CDP.
- ✅ **Action caching** — durable selectors + per-site strategy memory *(shipped 0.1.17)*
- ✅ **Shadow-DOM & iframe traversal** in the snapshot — modern date/airport pickers *(shipped 0.1.15)*
- ✅ **Scroll/virtualized-list hints** — `browser_collect` surfaces off-screen results *(shipped 0.1.16)*

## ⬜ v0.4 — Design & data tooling

- ⬜ **Visual diff** (`browser_visual_diff`) — compare two captures / vs baseline, pixel diff + changed zones *(medium)*
- ⬜ **HAR record/replay** — deterministic offline re-extraction, CI fixtures *(low)*
- ⬜ **Extraction pipeline** — composable clean→validate→dedupe→emit stages *(low/medium)*
- ✅ **CSV export** for SERP/rank batches — `serp-batch --csv` *(shipped 0.1.18)*

## ⬜ Later / optional

- ⬜ **Live view + human-in-the-loop** takeover (WebRTC iframe) for login/2FA/hard captcha *(medium/high)*
- ⬜ Session persistence: auto-save `storageState` on `browser_close`
- ⬜ Hosted endpoint (open-core) — managed sessions + proxies + scheduling *(product decision)*

## Known limits (today)

- Industrial anti-bot (aggressive Cloudflare Turnstile, DataDome, reCAPTCHA v2 image) needs residential proxies + a captcha solver.
- High request volume triggers "unusual traffic" without proxy rotation.
- Login/2FA needs your credentials or a CDP-attached logged-in session.
