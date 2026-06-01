# MCP tools

Complete reference for the 28 `browser_*` tools exposed by the fuse-browser MCP server.

Tools fall into two families:

- **One-shot / fast-path** (`browser_probe`, `browser_probe_html`, `browser_fetch`, `browser_serp_batch`) open a fresh browser (or do a pure HTTP fetch) per call and return a report. No session id needed.
- **Session tools** require a `sessionId` obtained from `browser_open` (or `browser_connect`). They drive one persistent, stateful page.

Every field is optional unless **Required** says `yes`. Defaults shown below come from the tool itself; many can also be set globally via `FUSE_*` environment variables — see [configuration](./configuration.md). Per-call arguments always override env defaults.

The shared identity/profile options (the `agentOptionShape`) are listed once under [`browser_open`](#browser_open); tools that accept them say so and link back.

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

HTTP fetch with browser TLS/HTTP2 impersonation — no browser launch, ~10x faster. For server-rendered HTML; not for JS/SPA pages (use `browser_probe` there).

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | yes | URL to fetch. |
| `extractPrices` | boolean | no | Run the price extractor on the body. |
| `proxyUrl` | string | no | Proxy to route the request through. |
| `maxChars` | integer | no | Truncate returned `text` (default `20000`). |

```json
{ "url": "https://example.com/pricing", "extractPrices": true, "maxChars": 5000 }
```

---

## Session

### browser_open

Open a persistent browser session and return `{ sessionId, expiresAt, identity }`. This is the canonical home of the **agentOptionShape** — every field below is also accepted by `browser_probe`, `browser_probe_html`, and `browser_serp_batch`.

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `engine` | enum `playwright` \| `patchright` \| `firefox` \| `webkit` | no | Browser engine. |
| `channel` | enum `chrome` \| `chrome-beta` \| `chrome-dev` \| `chrome-canary` \| `msedge` \| `msedge-beta` \| `msedge-dev` \| `msedge-canary` | no | Installed browser channel (real Chrome/Edge). |
| `executablePath` | string | no | Path to a browser binary. |
| `cdpEndpoint` | string | no | Attach to an existing browser over CDP. |
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

```json
{ "sessionId": "s_abc123", "selectors": true }
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

```json
{ "sessionId": "s_abc123", "viewports": ["mobile", "desktop"], "fullPage": true }
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
