# MCP tools

Complete reference for the 44 `browser_*` tools exposed by the fuse-browser MCP server.

Tools fall into two families:

- **One-shot / fast-path** (`browser_probe`, `browser_probe_html`, `browser_fetch`, `browser_fetch_batch`, `browser_crawl`, `browser_collect_batch`, `browser_shots_batch`, `browser_site_shots`, `browser_serp_batch`) open a fresh browser (or do a pure HTTP fetch) per call and return a report. No session id needed.
- **Structured extraction** (`browser_products`, `browser_collect`, `browser_extract`, `browser_extract_schema`) and `browser_autoscroll` (drain lazy lists) run against a live session.
- **Session tools** require a `sessionId` obtained from `browser_open` (or `browser_connect`). They drive one persistent, stateful page.

Every field is optional unless **Required** says `yes`. Defaults shown below come from the tool itself; many can also be set globally via `FUSE_*` environment variables — see [configuration](./configuration.md). Per-call arguments always override env defaults.

The shared identity/profile options (the `agentOptionShape`) are listed once under [`browser_open`](#browser_open); tools that accept them say so and link back.

## Capability groups (`FUSE_CAPS`)

By default all 44 tools are registered. Set the `FUSE_CAPS` env var (comma-separated group names) to expose fewer tools — a lighter context for the LLM client:

| Group | Tools |
| --- | --- |
| `core` | Session lifecycle (`browser_open`/`browser_status`/`browser_close`/`browser_connect`), navigation (`browser_navigate`/`browser_back`/`browser_forward`), actions (`browser_click`/`browser_fill`/`browser_login`/`browser_scroll`/`browser_press`/`browser_select`), `browser_tabs`, `browser_dialog`/`browser_downloads`, `browser_snapshot`/`browser_act`, `browser_wait`/`browser_wait_for`, `browser_screenshot`, `browser_autoscroll`. |
| `batch` | `browser_probe`, `browser_probe_html`, `browser_fetch`, `browser_fetch_batch`, `browser_crawl`, `browser_collect_batch`, `browser_shots_batch`, `browser_site_shots`, `browser_serp_batch`. |
| `extract` | `browser_collect`, `browser_run`, `browser_extract`, `browser_extract_schema`, `browser_products`. |
| `debug` | `browser_inspect`, `browser_console`, `browser_network`, `browser_visual_diff`, `browser_metrics`. |
| `live` | `browser_handoff`, `browser_live_view`, `browser_live_view_stop`. |

```sh
FUSE_CAPS=core,extract browser-mcp   # only the core + extract groups
```

Parsing is forgiving: names are case-insensitive and whitespace-tolerant (`"  CORE , Extract "` works), unknown names are reported on stderr and ignored, and a blank/unset value — or one containing **only** unknown names — falls back to all groups (never an empty server).

**Progress notifications.** The batch tools (`browser_fetch_batch`, `browser_crawl`, `browser_collect_batch`, `browser_shots_batch`, `browser_site_shots`, `browser_serp_batch`) emit MCP `notifications/progress` (`progress`/`total` per finished item, with the item URL/query as `message`) when the client sends a `progressToken` with the request. Clients that don't request progress see no change.

---

## One-shot

### browser_probe

Open a real browser, load a URL, and return text, screenshot path, network/console logs, and optional prices/visual/challenge analysis.

Accepts the full [agentOptionShape](#browser_open) (engine, proxy, locale, captcha, etc.) plus `url` and the probe flags below.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | yes | Page to load. |
| `actions` | array of `{type, ...}` | no | Pre-extraction actions to run (loose: `type` + arbitrary fields). |
| `humanApproved` | boolean | no | Authorize sensitive actions (guardrail gate). |
| `autoConsent` | boolean | no | Auto-dismiss cookie/consent banners. |
| `extractPrices` | boolean | no | Run the price extractor on the page text. |
| `waitMs` | integer | no | Extra wait (ms) after load before extracting. |
| `detectChallenges` | boolean | no | Detect bot-challenge / captcha walls. |
| `observeVisual` | boolean | no | Produce a visual observation of the rendered page. |
| `solveCaptcha` | boolean | no | Attempt captcha solving (needs `captcha` provider config). |
| `extractSerp` | boolean | no | Parse the page as a Google SERP. |
| `serpPages` | integer | no | Number of SERP pages to collect when `extractSerp`. |
| `rankDomain` | string | no | Report the SERP rank of this domain. |
| `extractContacts` | boolean | no | Extract `{ emails, phones, hasContactForm }` into `report.contacts`. |
| `contactCrawl` | object | no | `{ enabled, maxPages? }` — when no email is found, follow same-domain contact/impressum links (bounded). |
| `contactFilter` | enum `strict` \| `off` | no | Drop placeholder/template emails (default `strict`). |
| `fastPathFirst` | boolean | no | With `extractContacts`: try HTTP extraction first, escalate to the browser only if the card is incomplete (email AND phone). Sets `report.fastPath`. |
| _+ all_ [agentOptionShape](#browser_open) | — | no | Engine, proxy, identity, captcha, etc. |

```json
{ "url": "https://example.com", "extractPrices": true, "detectChallenges": true, "headless": true }
```

### browser_probe_html

Same engine as `browser_probe`, but loads an inline HTML fixture instead of a URL. Useful for tests and dry-runs.

Accepts the full [agentOptionShape](#browser_open) plus the same probe flags as `browser_probe` (`actions`, `humanApproved`, `autoConsent`, `extractPrices`, `waitMs`, `detectChallenges`, `observeVisual`, `solveCaptcha`, `extractSerp`, `serpPages`, `rankDomain`).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `html` | string | yes | Inline HTML document to render. |
| _+ probe flags_ | — | no | Same as `browser_probe`. |
| _+ all_ [agentOptionShape](#browser_open) | — | no | Engine, proxy, identity, captcha, etc. |

```json
{ "html": "<h1>Hi</h1><p>$19.99</p>", "extractPrices": true }
```

---

## Fast-path

### browser_fetch

HTTP fetch with browser TLS/HTTP2 impersonation — no browser launch, ~10x faster. For server-rendered HTML; for JS/SPA pages set `browserFallback: true` (or use `browser_probe`). Non-HTML responses (JSON APIs, `text/plain`) are returned **verbatim** — the markdown/HTML pipeline is skipped — so this also works as a fast JSON-API fetcher. The body download is capped at 10 MB.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | yes | URL to fetch. |
| `format` | enum `markdown` \| `text` | no | Output format (default `markdown`: main content + YAML frontmatter). Forced to raw `text` for non-HTML bodies (JSON, plain text). |
| `extractPrices` | boolean | no | Run the price extractor on the body. |
| `extractContacts` | boolean | no | Extract `{ emails, phones, hasContactForm }` from the fetched HTML (no browser). |
| `contactFilter` | enum `strict` \| `off` | no | Drop placeholder/template emails (default `strict`). |
| `countryCode` | string | no | Default region for phone E.164 parsing (default `CH`). |
| `proxyUrl` | string | no | Proxy to route the request through. |
| `maxChars` | integer | no | Truncate returned `text` (default `20000`). |
| `browserFallback` | boolean | no | When the HTTP response is an empty SPA/CSR shell, re-render it in a real browser and return the rendered markdown. Off by default. The response sets `escalated: true` when this happens. |

```json
{ "url": "https://example.com", "extractContacts": true }
```

---

### browser_fetch_batch

Fetch **many URLs in parallel** via the HTTP fast-path (TLS impersonation, no browser launch), bounded concurrency. Each URL keeps `browser_fetch` semantics (markdown for HTML, JSON/plain-text verbatim, per-URL `browserFallback`). Results come back in input order; a failed URL becomes `{ url, error }` and never aborts the batch.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `urls` | string[] | yes | URLs to fetch. |
| `format` | enum `markdown` \| `text` | no | Output format (default `markdown`; forced to `text` for non-HTML). |
| `maxChars` | integer | no | Truncate each returned `text` (default `20000`). |
| `browserFallback` | boolean | no | Re-render empty SPA/CSR shells in a real browser (per URL). |
| `proxyUrl` | string | no | Proxy to route the requests through. |
| `concurrency` | integer | no | Max parallel fetches (default `8`). |

```json
{ "urls": ["https://a.example", "https://b.example"], "concurrency": 5 }
```

Returns `{ count, results: [{ status, url, format, escalated, text } | { url, error }] }`.

---

### browser_crawl

Crawl a site from a seed URL via the HTTP fast-path (no browser launch): breadth-first, fetching each depth level in parallel, returning clean markdown per page. Same-origin and robots.txt-honored **by default**; bounded by `maxPages`/`maxDepth`. For JS/SPA pages set `browserFallback:true` (renders empty shells per page).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | yes | Seed URL. |
| `maxPages` | integer | no | Page cap (default `25`). |
| `maxDepth` | integer | no | BFS depth from the seed (default `2`). |
| `sameOrigin` | boolean | no | Stay on the seed's origin (default `true`). |
| `concurrency` | integer | no | Parallel fetches per level (default `5`). |
| `format` | enum `markdown` \| `text` | no | Per-page output (default `markdown`). |
| `maxChars` | integer | no | Truncate each page's `text` (default `20000`). |
| `browserFallback` | boolean | no | Re-render empty SPA/CSR shells per page. |
| `respectRobots` | boolean | no | Honor robots.txt (default `true`; set `false` to opt out). |
| `throttleMs` | integer | no | Base gap between hits on the same host (default `250`; `0` disables), **jittered** per request (`[base/2, base*1.5]`) to look human. Keeps big crawls polite / unblocked. |
| `proxyUrl` | string | no | Proxy to route requests through. |

```json
{ "url": "https://docs.example.com", "maxPages": 30, "maxDepth": 2 }
```

Returns `{ count, pages: [{ status, url, format, escalated, text, depth }] }`.

---

### browser_shots_batch

Full-page **responsive screenshots for many URLs in parallel** — the visual counterpart of `browser_fetch_batch`. Each URL is rendered in a real browser at each viewport and saved as a PNG. Concurrency is **low by default (2)** — every page is a full Chromium instance. A failed URL becomes `{ url, error }`.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `urls` | string[] | yes | URLs to capture. |
| `viewports` | string | no | CSV of presets/sizes, e.g. `mobile,desktop,1280x720` (default `mobile,desktop`). |
| `settleMs` | integer | no | Settle delay before each capture. |
| `concurrency` | integer | no | Max browsers in flight (default `2`). |
| `engine` | string | no | Engine to launch. |
| `countryCode` | string | no | Identity country. |
| `headless` | boolean | no | Run headless (default true). |
| `proxyUrl` | string | no | Proxy to route through. |

```json
{ "urls": ["https://a.example", "https://b.example"], "viewports": "mobile,desktop" }
```

Returns `{ count, results: [{ url, shots: [{ viewport, width, height, path }] } | { url, error }] }`.

---

### browser_collect_batch

The collect side of **crawl + collect**: exhaust the **infinite-scroll / paginated list** of many listing URLs in parallel. One real browser per URL drains the page (scroll + dedup by row key) and returns all items. Low concurrency (default 2), jittered per-host throttle, per-URL error isolation. Use `browser_crawl` to find category/search pages, then drain each here.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `urls` | string[] | yes | Listing/search URLs to exhaust. |
| `item` | string | yes | CSS selector for one list row. |
| `container` | string | no | Scroll container selector (auto-detected if omitted). |
| `maxSteps` | integer | no | Max scroll steps per page (default 60). |
| `extractPrices` | boolean | no | Run the price extractor on each row. |
| `concurrency` | integer | no | Max browsers in flight (default 2). |
| `throttleMs` | integer | no | Jittered per-host gap between URLs (default 250; 0 disables). |
| `engine` / `countryCode` / `headless` / `proxyUrl` | — | no | Browser options. |

```json
{ "urls": ["https://site/search?q=x"], "item": ".listing-card", "extractPrices": true }
```

Returns `{ count, results: [{ url, count, steps, reachedEnd, items } | { url, error }] }`.

---

### browser_site_shots

**Full-site snapshot in one call**: crawl the site (HTTP fast-path, same-origin, robots-honored) then screenshot each discovered page. Returns **both** the content (markdown, from the crawl) **and** responsive full-page PNGs per page. For visual QA/audit, design review, or a regression baseline. Heavy — one browser per page — so `maxPages` stays modest and shots run at low concurrency.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | yes | Seed URL. |
| `maxPages` / `maxDepth` | integer | no | Crawl bounds (default 25 / 2). |
| `sameOrigin` / `respectRobots` | boolean | no | Default true. |
| `throttleMs` | integer | no | Jittered per-host crawl gap (default 250). |
| `viewports` | string | no | CSV (default `mobile,desktop`). |
| `settleMs` | integer | no | Settle delay before each capture. |
| `shotsConcurrency` | integer | no | Max browsers in flight (default 2). |
| `engine` / `countryCode` / `headless` / `proxyUrl` | — | no | Browser options. |

```json
{ "url": "https://example.com", "maxPages": 20, "viewports": "mobile,desktop" }
```

Returns `{ count, pages: [{ url, depth, text, shots: [{ viewport, width, height, path }], shotsError? }] }`.

---

## Session

### browser_open

Open a persistent browser session and return `{ sessionId, expiresAt, identity }`. This is the canonical home of the **agentOptionShape** — every field below is also accepted by `browser_probe`, `browser_probe_html`, and `browser_serp_batch`.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `engine` | enum `playwright` \| `patchright` \| `firefox` \| `webkit` | no | Browser engine. |
| `channel` | enum `chrome` \| `chrome-beta` \| `chrome-dev` \| `chrome-canary` \| `msedge` \| `msedge-beta` \| `msedge-dev` \| `msedge-canary` | no | Installed browser channel (real Chrome/Edge). |
| `executablePath` | string | no | Path to a browser binary. |
| `cdpEndpoint` | string | no | Attach to an existing browser over CDP (local `http://localhost:9222` or remote `wss://…`, e.g. Browserless). |
| `cdpHeaders` | object | no | Extra headers for the CDP connect handshake (e.g. `{ "Authorization": "Bearer …" }`). |
| `cdpCloseOnDone` | boolean | no | Close the remote CDP session on teardown (default `true` for `ws/wss`). |
| `cdpTimeoutMs` | integer | no | CDP connect timeout (default `20000`). |
| `respectRobots` | boolean | no | Honor the origin's `robots.txt` (opt-in; off by default — nothing is blocked unless enabled). |
| `headless` | boolean | no | Run headless (set `false` for `browser_handoff`). |
| `humanMode` | boolean | no | Human-like timing/movement for actions. |
| `locale` | string | no | Browser locale (e.g. `en-US`). |
| `timezoneId` | string | no | IANA timezone (e.g. `Europe/Paris`). |
| `countryCode` | string | no | Country code for geo/identity. |
| `currency` | string | no | Currency hint. |
| `userDataDir` | string | no | Persistent profile directory. |
| `proxyUrl` | string | no | Single proxy URL. |
| `proxyMapPath` | string | no | Path to a per-domain proxy map. |
| `proxiesPath` | string | no | Path to a proxy pool file. |
| `storageStatePath` | string | no | Load/save cookies + localStorage. |
| `harPath` | string | no | Record/replay HAR file path. |
| `harMode` | enum `minimal` \| `full` | no | HAR recording detail. |
| `harReplay` | string | no | HAR file to replay responses from. |
| `realisticProfile` | boolean | no | Apply a realistic fingerprint profile. |
| `replayEnabled` | boolean | no | Enable action replay capture. |
| `replayDir` | string | no | Directory for replay artifacts. |
| `siteMemoryDir` | string | no | Directory for per-site action memory. |
| `outputDir` | string | no | Output directory for artifacts. |
| `retry` | object | no | `{ maxAttempts?, baseMs?, capMs?, throttleMs? }` (all integers). |
| `captcha` | object | no | `{ provider: "2captcha" \| "anticaptcha" \| "capmonster", apiKey, baseUrl?, timeoutMs?, pollMs? }`. |

```json
{ "engine": "patchright", "headless": false, "locale": "en-US", "proxyUrl": "http://user:pass@host:8000" }
```

### browser_status

Status of one session (by `sessionId`) or all sessions if omitted.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | no | Target session; omit for a list of all sessions. |

```json
{ "sessionId": "s_abc123" }
```

### browser_close

Close a browser session by id.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Session to close. |

```json
{ "sessionId": "s_abc123" }
```

### browser_connect

Launch an installed browser with remote debugging, attach to it, and return a session id. Drives the user's real browser.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `browser` | enum `dia` \| `chrome` \| `edge` \| `brave` \| `arc` | no | Known browser to launch (default `chrome`). |
| `executablePath` | string | no | Explicit binary path (overrides `browser`). |
| `port` | integer | no | Remote-debugging port (default `9222`). |
| `userDataDir` | string | no | Profile directory for the launched browser. |
| `launch` | boolean | no | If `false`, attach to an already-running instance instead of spawning. |

```json
{ "browser": "chrome", "port": 9222 }
```

### browser_tabs

Manage the tabs of a live session: list them, open a new tab (optional `url`), select one as the active target of every other `browser_*` tool, or close one. Use it when a click spawned a popup (OAuth login, `target=_blank` link): `list` to find it, `select` to drive it, `close` then `select` to come back.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `action` | enum `list` \| `new` \| `select` \| `close` | yes | Tab action to perform. |
| `index` | number | no* | Tab index (**required** for `select`/`close`; `missing_index` error otherwise). |
| `url` | string | no | URL to open in the new tab (for `new`). |

Always returns the tab list plus the active index after the action: `{ tabs, active }`. Closing the last tab is refused (`cannot_close_last_tab`) — use `browser_close` to end the session. An out-of-range `index` returns `invalid_tab_index`.

```json
{ "sessionId": "s_abc123", "action": "select", "index": 1 }
```

### browser_dialog

Set how native dialogs (`alert`/`confirm`/`prompt`/`beforeunload`) are handled on this session: accept or dismiss, with optional text for prompts. Applies to **upcoming** dialogs; the default policy (before any call) is **dismiss**. Dialog handling is auto-attached when the session opens, so dialogs never block a run.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `action` | enum `accept` \| `dismiss` | yes | Policy applied to upcoming dialogs. |
| `promptText` | string | no | Text typed into `prompt` dialogs when accepting. |

Returns `{ policy, recent }` — `recent` is the last observed dialogs (max 20, oldest first), each `{ type, message, at, handled }`.

```json
{ "sessionId": "s_abc123", "action": "accept", "promptText": "yes" }
```

### browser_downloads

List the files downloaded by this session. Download capture is auto-attached when the session opens: every download is saved under `<outputDir>/downloads/<suggestedFilename>` (suffixing `-1`, `-2` on name collisions) and recorded.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |

Returns `{ count, downloads }` — each download is `{ url, suggestedFilename, path, at, error? }` (`path` is empty while saving or when `error` is set).

```json
{ "sessionId": "s_abc123" }
```

---

## Navigate

### browser_navigate

Navigate a live session to a URL; returns the resulting `{ url, title }`.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `url` | string | yes | Destination URL. |
| `waitMs` | integer | no | Extra wait (ms) after load. |

```json
{ "sessionId": "s_abc123", "url": "https://example.com" }
```

### browser_back

Navigate back in session history.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |

```json
{ "sessionId": "s_abc123" }
```

### browser_forward

Navigate forward in session history.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |

```json
{ "sessionId": "s_abc123" }
```

### browser_wait

Wait for a fixed number of milliseconds.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `ms` | integer | yes | Milliseconds to wait. |

```json
{ "sessionId": "s_abc123", "ms": 1500 }
```

### browser_wait_for

Wait until a semantic condition holds: text appears, selector visible, selector gone, or URL contains a substring. Prefer over fixed delays.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `text` | string | no | Wait until this text appears. |
| `selector` | string | no | Wait until this selector is visible. |
| `gone` | string | no | Wait until this selector disappears. |
| `urlContains` | string | no | Wait until the URL contains this substring. |
| `timeoutMs` | integer | no | Max wait before failing. |

```json
{ "sessionId": "s_abc123", "selector": "#results", "timeoutMs": 10000 }
```

---

## Act

### browser_click

Click a target in the session.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `target` | string | yes | Selector or text of the element to click. |

```json
{ "sessionId": "s_abc123", "target": "Sign in" }
```

### browser_fill

Fill a field in the session.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `target` | string | yes | Selector or label of the field. |
| `value` | string | yes | Value to type. |

```json
{ "sessionId": "s_abc123", "target": "#email", "value": "a@b.com" }
```

### browser_login

Structured login (username + password + submit).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `username` | string | yes | Username/email value. |
| `password` | string | yes | Password value. |
| `usernameTarget` | string | no | Selector for the username field (auto-detected otherwise). |
| `passwordTarget` | string | no | Selector for the password field. |
| `submitTarget` | string | no | Selector for the submit button. |

```json
{ "sessionId": "s_abc123", "username": "a@b.com", "password": "secret" }
```

### browser_scroll

Scroll by a pixel delta, or jump to the end of a scrollable container.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `deltaY` | number | no | Vertical scroll (positive = down, default `600`). |
| `deltaX` | number | no | Horizontal scroll (default `0`). |
| `selector` | string | no | Scroll a specific container (auto-detected when omitted with `to`). |
| `to` | enum `end` | no | Jump to the container's bottom. |

```json
{ "sessionId": "s_abc123", "selector": "#list", "to": "end" }
```

### browser_press

Press a key or shortcut (e.g. `Enter`, `ArrowDown`, `Control+a`).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `key` | string | yes | Key or shortcut to press. |

```json
{ "sessionId": "s_abc123", "key": "Enter" }
```

### browser_select

Select an option in a `<select>` by value, label, or index.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `target` | string | yes | Selector of the `<select>`. |
| `value` | string | yes | Value, label, or index to select. |

```json
{ "sessionId": "s_abc123", "target": "#country", "value": "France" }
```

---

## Agentic

### browser_snapshot

Return the indexed interactive elements of the live page, each with a `ref` to use with `browser_act`. Pierces open Shadow DOM and iframes (same- and cross-origin); sub-frame refs look like `"3:4"`.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `selectors` | boolean | no | Also return a durable CSS `selector` per element (cacheable to act later without re-snapshotting). |
| `annotate` | boolean | no | Also return a Set-of-Marks JPEG: numbered badges (= each `ref`) drawn over the page, for vision models (main-frame, viewport-only). |

```json
{ "sessionId": "s_abc123", "annotate": true }
```

### browser_act

Execute click/fill/select/pick on an element by `ref` (from `browser_snapshot`) or by `target` text. Returns a diff of what changed on the page (added/removed/text/url).

`pick` = type `value` into a combobox, then click the matching suggestion (`option` text, defaults to `value`) — for airport/city autocompletes.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `kind` | enum `click` \| `fill` \| `select` \| `pick` | yes | Action to perform. |
| `ref` | integer \| string | no | Element ref from `browser_snapshot` (e.g. `12` or `"3:4"`). |
| `target` | string | no | Text/selector fallback when no `ref`. |
| `value` | string | no | Value to type/select (for `fill`/`select`/`pick`). |
| `option` | string | no | Suggestion text to click for `pick` (defaults to `value`). |
| `annotate` | boolean | no | Also return a Set-of-Marks JPEG of the NEW state (re-marked, anti-drift). |

Provide either `ref` or `target`.

```json
{ "sessionId": "s_abc123", "kind": "fill", "ref": 12, "value": "Paris" }
```

### browser_run

Execute an ordered multi-step plan (navigate, click, fill, scroll, press, select, wait_for, extract) in one call. Stops at the first failed step. Sensitive actions require `humanApproved`.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `steps` | array of `{type, ...}` | yes | Ordered steps (loose: `type` + arbitrary fields). |
| `humanApproved` | boolean | no | Authorize sensitive steps (preflight gate). |

```json
{ "sessionId": "s_abc123", "steps": [{ "type": "navigate", "url": "https://x.com" }, { "type": "click", "target": "Next" }] }
```

### browser_collect

Scroll a virtualized/infinite list and return the deduped union of its rows — items beyond the first screen that a single snapshot misses. Returns DATA (key/text/url/prices), not actionable refs. To act on a found row, use `browser_act` by text, or `browser_scroll(selector)` then `browser_snapshot`.

The optional `pipeline` runs a declarative clean→validate→dedupe→emit pass over collected rows — see [extraction](./extraction.md).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `item` | string | yes | CSS selector for a single row. |
| `container` | string | no | Scrollable container selector (auto-detected otherwise). |
| `maxSteps` | integer | no | Max scroll iterations. |
| `extractPrices` | boolean | no | Extract prices from each row. |
| `pipeline` | object | no | `{ clean?: {numericFields?}, validate?: {field→rule}, dedupeBy?, keep?: "first"\|"last", columns?, emit?: "json"\|"csv" }`. See [extraction](./extraction.md). |

```json
{ "sessionId": "s_abc123", "item": ".result-card", "extractPrices": true, "maxSteps": 20 }
```

### browser_autoscroll

Repeatedly scroll a long / infinite list to the bottom to trigger lazy-load until it stabilises — run it **before** `browser_extract` / `browser_collect` / `browser_products` on lazy-loaded result pages so every item is in the DOM. Stops after `idleRounds` rounds without growth, at `maxScrolls`, or once `untilSelector` reaches `minCount` elements.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `maxScrolls` | integer | no | Hard cap on scroll rounds. |
| `idleRounds` | integer | no | Stop after this many rounds with no height growth. |
| `untilSelector` | string | no | Stop once this selector reaches `minCount` matches. |
| `minCount` | integer | no | Element count target for `untilSelector`. |
| `delayMs` | integer | no | Pause between scroll rounds. |

Returns `{ rounds, height, url }`.

```json
{ "sessionId": "s_abc123", "untilSelector": ".result-card", "minCount": 100 }
```

---

## Extract

### browser_extract

Extract text, prices, hotel offers, and/or challenges from the live page.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `kind` | enum `text` \| `prices` \| `hotels` \| `challenges` \| `all` | no | What to extract (default `all`). |

```json
{ "sessionId": "s_abc123", "kind": "prices" }
```

### browser_extract_schema

Extract typed data from the live page via a field map. Deterministic; reads the rendered DOM, so it works on Next.js/SPA pages.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `schema` | record of `field → fieldSpec` | yes | Map of output field to a `fieldSpec`. |

`fieldSpec`: `{ selector: string, attr?: string, all?: boolean, abs?: boolean }` — `attr` reads an attribute instead of text, `all` returns an array of matches, `abs` resolves URLs to absolute.

```json
{
  "sessionId": "s_abc123",
  "schema": {
    "title": { "selector": "h1" },
    "links": { "selector": "a", "attr": "href", "all": true, "abs": true }
  }
}
```

### browser_products

Extract structured **per-card** product rows from an e-commerce / search-results page: one `{title, price, currency, url?}` per card, each price tied to its own title (unlike flat price scraping). Generic — detects repeated card containers by structure, so it works on Digitec, Booking, Amazon… Prices are parsed **layout-agnostically** (prefix/suffix currency, thousands/decimal markup, CH/EU formats). Sort the rows by price to answer "which is the cheapest?". Also exposed as the CLI `products` command.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `limit` | integer | no | Cap the number of returned rows. |
| `containerSelector` | string | no | Pin the card-container selector (auto-detected otherwise). |

Returns `{ url, count, products: [{ title, price, currency, url? }] }`.

```json
{ "sessionId": "s_abc123", "limit": 20 }
```

---

## SERP

### browser_serp_batch

Run several Google searches in one session; returns per-query organic results and optional domain rank. Sequential and throttled (small batches; high volume needs proxies). Accepts the full [agentOptionShape](#browser_open).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `queries` | array of string | yes | Search queries to run. |
| `rankDomain` | string | no | Report the SERP rank of this domain per query. |
| `pages` | integer | no | SERP pages per query (default `1`). |
| `hl` | string | no | Google UI language (e.g. `en`). |
| `gl` | string | no | Google country (e.g. `us`). |
| `delayMs` | integer | no | Delay between queries. |
| _+ all_ [agentOptionShape](#browser_open) | — | no | Engine, proxy, identity, etc. |

> The CLI exposes a `--csv` output flag for this command; it is **CLI-only** and not an MCP parameter. (The probe flag `serpPages` is the equivalent of `pages` for `browser_probe`'s inline SERP extraction.)

```json
{ "queries": ["best running shoes", "trail shoes"], "rankDomain": "example.com", "pages": 2, "gl": "us" }
```

---

## Vision

### browser_screenshot

Capture the live page as PNG(s) for vision. Pass `ref` for one element, `viewport` for one size, or `viewports` for a responsive set.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `fullPage` | boolean | no | Capture the full scrollable page. |
| `ref` | integer \| string | no | Screenshot a single element by ref. |
| `viewport` | enum `mobile` \| `tablet` \| `desktop` _or_ `{width, height}` | no | Capture at one viewport size. |
| `viewports` | array of the above | no | Capture across several viewport sizes. |
| `colorScheme` | enum `light` \| `dark` | no | Emulate `prefers-color-scheme` and toggle `themeClass` on `<html>`, then restore. |
| `themeClass` | string | no | Class toggled on `<html>` for class-based dark themes (default `dark`). |
| `annotate` | boolean | no | Set-of-Marks JPEG: numbered badges (= each `ref`) over the viewport, for vision models. |

```json
{ "sessionId": "s_abc123", "annotate": true, "colorScheme": "dark" }
```

### browser_inspect

Computed styles, box model and WCAG text-contrast (AA/AAA) for one element by `ref` — for design review (typography, color, spacing, contrast). Main-frame refs.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `ref` | integer \| string | yes | Element ref from `browser_snapshot`. |

```json
{ "sessionId": "s_abc123", "ref": 12 }
```

### browser_visual_diff

Pixel-compare the live page against a `baseline` PNG (created on the first call, diffed on later calls), or two explicit PNGs (`a` + `b`). Returns `diffPixels`/`diffRatio` and changed-region boxes, and writes a highlighted `<path>.diff.png`. Fails if image sizes differ.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | no* | Session to screenshot (required with `baseline`). |
| `baseline` | string | no* | Baseline PNG path (created first run, then diffed). |
| `a` | string | no* | First PNG path (explicit two-image mode). |
| `b` | string | no* | Second PNG path; diff written to `<b>.diff.png`. |
| `fullPage` | boolean | no | Full-page capture in baseline mode. |
| `threshold` | number | no | Per-pixel match threshold (default `0.1`). |

\* Provide **either** `a` + `b`, **or** `sessionId` + `baseline`.

```json
{ "sessionId": "s_abc123", "baseline": "./baselines/home.png", "fullPage": true, "threshold": 0.1 }
```

---

## Human

### browser_handoff

Pause the agent and let a human complete a step in the live browser (login / 2FA / hard captcha), then resume when `url` (substring/regex) or `selector` appears. Same session, so auth carries over. Needs `headless:false` for a human to actually interact (headless still waits but surfaces a warning).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `reason` | string | no | Human-readable reason for the handoff. |
| `url` | string | no | Resume when the URL matches (substring; `*` becomes regex). |
| `selector` | string | no | Resume when this selector appears. |
| `timeoutMs` | integer | no | Max wait before timing out (default `300000`). |

If neither `url` nor `selector` is given, it resumes on the next navigation.

```json
{ "sessionId": "s_abc123", "reason": "Solve captcha", "selector": "#dashboard", "timeoutMs": 300000 }
```

---

## Diagnostics

### browser_metrics

Read the process-global scraping metrics: a point-in-time snapshot of probe counts, durations, resilience rejections, the live probe-queue depth, RSS and uptime. No session needed. Pass `reset:true` to zero the counters after reading (e.g. at the start of a new job).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `reset` | boolean | no | Zero all counters **after** returning the snapshot. |

Returned fields: `uptimeMs`, `probesOk`, `probesFailed`, `avgDurationMs`, `minDurationMs`, `maxDurationMs`, `breakerRejects` (requests blocked by an open [circuit breaker](./configuration.md#circuit-breaker)), `queueRejects` / `budgetRejects` (from the [probe queue](./configuration.md#probe-queue)), `queue` (`{ running, admitted, waiting }`), `rssBytes`. Counters are process-global and persist until reset; the HTTP fast-path is not counted (only browser probes).

```json
{ "reset": false }
```

### browser_console

Console messages captured in the session since open (last 80 kept). Use to debug JS errors, CSP violations, or why a page misbehaves.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `level` | enum `error` \| `warning` \| `info` \| `log` \| `debug` | no | Keep only this console message type. |
| `limit` | number | no | Last N entries returned (default `50`). |

Returns `{ count, entries }`.

```json
{ "sessionId": "s_abc123", "level": "error", "limit": 20 }
```

### browser_network

Network requests captured in the session since open (last 80 kept), merged into one row per URL: `method`, `url`, `status`, `resourceType`. Use to debug why a page does not load: failed requests (`status: 404/500`), blocked APIs (`urlContains`). Entries without `status` got no response (pending/failed).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `status` | number | no | Keep only rows with this exact HTTP status. |
| `urlContains` | string | no | Keep only rows whose URL contains this substring. |
| `limit` | number | no | Last N rows returned (default `50`). |

Returns `{ count, requests }`.

```json
{ "sessionId": "s_abc123", "status": 404 }
```

---

## Live view

Watch a session's browser in real time from a normal web page — works even for **headless** sessions. A CDP screencast streams JPEG frames over an ephemeral, token-gated `127.0.0.1` server (Server-Sent Events) to a `<canvas>`/`<img>` viewer. **Read-only** (no click-through). The frame stream binds to the page at start; after a crash recovery it does not auto-reattach — call `browser_live_view` again.

### browser_live_view

Start the live view for a session and return the viewer URL (token embedded). Opens it in the OS default browser unless `open:false`.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | string | yes | Target session. |
| `quality` | integer | no | JPEG quality 1–100 (default `60`). |
| `maxWidth` | integer | no | Max frame width in px (default `1280`). |
| `maxHeight` | integer | no | Max frame height in px (default `720`). |
| `open` | boolean | no | Open the URL in the default browser (default `true`). |

Returns `{ url, note }`. The server auto-closes when the page closes or on `browser_live_view_stop`.

```json
{ "sessionId": "s_abc123", "quality": 60, "open": true }
```

### browser_live_view_stop

Stop a session's live view and shut down its local server. Returns `{ stopped: true|false }` (`false` if none was running).

```json
{ "sessionId": "s_abc123" }
```
