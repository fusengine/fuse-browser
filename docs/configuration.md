# Configuration

fuse-browser reads configuration from three places, in increasing priority:

1. **`FUSE_*` environment variables** — server-wide defaults, useful to pin an engine, channel, or CDP endpoint once in your MCP config.
2. **Library `AgentOptions`** — passed to the agent when used as a library.
3. **Per-call MCP tool arguments** — every field of `AgentOptions` is also accepted as an argument on `browser_probe` / `browser_probe_html`.

A **per-call argument always wins** over a library option, which always wins over a `FUSE_*` env default. Any value left unset falls back to the resolved default described below.

See [./anti-bot.md](./anti-bot.md) for proxy and captcha details, and [./sessions.md](./sessions.md) for HAR recording/replay and `storageState`.

## AgentOptions

Every field is optional. Defaults are applied by `resolveConfig` (`src/agent/config.ts`); identity-derived defaults are resolved by `resolveIdentity` (`src/identity/resolve.ts`).

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `outputDir` | `string` | detected host-agent dir (e.g. `.claude/fuse-browser`) else `~/.fuse-browser` | Root directory for all artifacts (reports, screenshots, site-memory, replay). See [Output location](#output-location). |
| `engine` | `"playwright" \| "patchright" \| "firefox" \| "webkit"` | `"patchright"` | Browser automation engine. `patchright` is the stealth-patched Chromium driver. |
| `channel` | `"chrome" \| "chrome-beta" \| "chrome-dev" \| "chrome-canary" \| "msedge" \| "msedge-beta" \| "msedge-dev" \| "msedge-canary"` | `null` (bundled browser) | Use a real installed browser channel instead of the bundled one. |
| `executablePath` | `string` | `null` | Absolute path to a browser binary, overriding `channel` / the bundled browser. |
| `cdpEndpoint` | `string` | `null` | Connect over the Chrome DevTools Protocol to an already-running browser instead of launching one. Accepts a local debug URL (`http://localhost:9222`) or a remote websocket (`wss://host/...`, e.g. Browserless). |
| `cdpHeaders` | `Record<string,string>` | `null` | Extra headers for the CDP connect handshake — e.g. `{ Authorization: "Bearer <token>" }` for an authenticated Browserless endpoint. (Token can also be passed inline as `?token=` in `cdpEndpoint`.) |
| `cdpCloseOnDone` | `boolean` | `true` for `ws/wss`, else `false` | Close the CDP session on teardown. Remote endpoints (Browserless) get a fresh context that is closed when done; a local attach never closes the user's browser (only the link is dropped). |
| `cdpTimeoutMs` | `number` | `20000` | Timeout (ms) for the CDP connect. |
| `storageStatePath` | `string` | `null` | Path to a Playwright storage-state JSON to load/persist a logged-in session. Persistence covers **cookies + localStorage + IndexedDB**, and the auth is saved **at login time** (right after a successful `browser_login`) **and on close** — not only on teardown. See [./sessions.md](./sessions.md). |
| `profile` | `string` | `null` | Named persistent auth profile — shorthand for `storageStatePath` at `~/.fuse-browser/profiles/<name>.json` (`FUSE_BROWSER_HOME` overrides the home dir; ignored when `storageStatePath` is set). Same full persistence (cookies + localStorage + IndexedDB, saved at login + on close). Name: letters/digits then `-`/`_`, max 41 chars. |
| `blockResources` | `string[]` | `null` (off) | Resource types aborted at the network layer to speed up batch runs: `image`, `media`, `font`, `stylesheet`, `script`, `xhr`, `fetch`, `websocket`, `manifest`, `other`. Unknown types are ignored. |
| `harPath` | `string` | `null` | Record network traffic to this HAR file. See [./sessions.md](./sessions.md). |
| `harMode` | `"minimal" \| "full"` | `"minimal"` | HAR recording detail. `minimal` records metadata only; `full` records response bodies. |
| `harReplay` | `string` | `null` | Replay network traffic from this HAR file instead of hitting the live network. |
| `humanMode` | `boolean` | `false` | Enable human-like interaction pacing for actions. |
| `headless` | `boolean` | `true` | Run the browser without a visible window. |
| `locale` | `string` | derived from `countryCode` profile | BCP-47 locale (e.g. `fr-FR`). Overrides the country profile's locale individually. |
| `timezoneId` | `string` | derived from `countryCode` profile | IANA timezone (e.g. `Europe/Zurich`). Overrides the country profile's timezone individually. |
| `countryCode` | `string` | `"CH"` | ISO country code driving the identity profile (locale, timezone, geolocation, currency, accept-language). See [Identity](#identity). |
| `currency` | `string` | derived from `countryCode` profile | Currency code (e.g. `CHF`). Uppercased. Overrides the country profile's currency individually. |
| `userDataDir` | `string` | `null` | Persistent browser user-data directory (created if missing). |
| `proxyUrl` | `string` | `null` | Explicit proxy URL for all traffic. See [./anti-bot.md](./anti-bot.md). |
| `proxyCountryMap` | `Record<string, string>` | none | Inline map of country code → proxy URL; the entry matching the resolved country is selected. |
| `proxyMapPath` | `string` | none | Path to a JSON country→proxy map (merged with `proxyCountryMap`). |
| `proxiesPath` | `string` | none | Path to a JSON array of proxy URLs used as a fallback pool when no explicit/mapped proxy resolves. |
| `realisticProfile` | `boolean` | `true` | Apply a realistic desktop user-agent and fingerprint defaults. See [Identity](#identity). |
| `replayEnabled` | `boolean` | `false` | Enable the action replay subsystem. |
| `replayDir` | `string` | `<outputDir>/replay` | Directory for replay artifacts. |
| `siteMemoryDir` | `string` | `<outputDir>/site-memory` | Directory for per-site memory (created if missing). |
| `retry` | `Partial<RetryConfig>` | see [Retry](#retry) | Navigation retry/backoff overrides. |
| `circuitBreaker` | `CircuitBreakerOptions` | `null` (off) | Opt-in per-host circuit breaker. See [Circuit breaker](#circuit-breaker). |
| `probeQueue` | `ProbeQueueOptions` | `null` (off) | Opt-in bounded probe queue + per-process budget. See [Probe queue](#probe-queue). |
| `captcha` | `CaptchaConfig` | `null` | Opt-in captcha solver config (authorized testing only). See [./anti-bot.md](./anti-bot.md). |

## Identity

The browser identity is derived from `countryCode` by `resolveIdentity`. The country code selects a `CountryProfile` that supplies `locale`, `timezoneId`, `currency`, `geolocation`, and `acceptLanguage`. The default country is **`CH`** (Switzerland).

- **`countryCode`** drives all identity fields. If unset, it is inferred from `locale` (via locale→country hints), and otherwise defaults to `CH`. The value is uppercased.
- **`locale`** and **`timezoneId`** override their profile values individually without changing the rest of the profile.
- **`currency`** overrides the profile currency individually (uppercased).
- **`realisticProfile`** (default `true`) applies a realistic desktop user-agent and fingerprint so the session looks like an ordinary browser.

`geolocation` and `acceptLanguage` always come from the resolved country profile (they have no per-call override).

## Environment variables (FUSE_*)

Read by `envAgentDefaults` (`src/server/env-defaults.ts`) and the proxy loader (`src/proxy/load.ts`). Each is a fallback that a per-call argument overrides. Unset variables stay undefined (the resolved default then applies).

| Variable | Maps to / effect | Notes |
|----------|------------------|-------|
| `FUSE_ENGINE` | `engine` | One of `playwright` / `patchright` / `firefox` / `webkit`. |
| `FUSE_CHANNEL` | `channel` | Installed-browser channel (e.g. `chrome`, `msedge`). |
| `FUSE_CDP_ENDPOINT` | `cdpEndpoint` | CDP URL of a running browser to connect to. |
| `FUSE_EXECUTABLE_PATH` | `executablePath` | Path to a browser binary. |
| `FUSE_HEADLESS` | `headless` | Boolean-ish: any value except `"false"` is `true`; unset leaves it undefined. |
| `FUSE_COUNTRY` | `countryCode` | ISO country code for the identity profile. |
| `FUSE_CURRENCY` | `currency` | Currency code. |
| `FUSE_USER_DATA_DIR` | `userDataDir` | Persistent user-data directory. |
| `FUSE_STORAGE_STATE` | `storageStatePath` | Path to a storage-state JSON. |
| `FUSE_OUTPUT_DIR` | `outputDir` | Override the artifact output directory. |
| `FUSE_PROXIES` | proxy pool | Comma- or newline-separated proxy URLs; deduped, blanks dropped. Merged with `proxiesPath`. Treat as a secret. |
| `FUSE_CAPS` | tool-group filter | Comma-separated [capability groups](./mcp-tools.md#capability-groups-fuse_caps) to register (`core`/`batch`/`extract`/`debug`/`live`). Case-insensitive, whitespace-tolerant; unknown names are ignored. Blank/unset (or only-unknown) = all 50 tools. Server-only (no per-call/library equivalent). |
| `FUSE_NETLOG_MAX` | network/console log cap | Max entries kept per session in `browser_console` / `browser_network` (oldest dropped). Positive integer; default `250`. |
| `FUSE_VAULT_KEY` | vault master key | Base64 of exactly 32 bytes. When unset, a random key is generated at `<home>/vault.key` (`0600`). Lets you inject the key from a secret manager instead of the disk. At-rest AES-256-GCM protects the blob when it travels without its key (backup, sync, accidental `git add`) — it is **not** a defense against local malware running as the same user. Treat as a secret. |
| `FUSE_VAULT_ALLOW_ANY_ORIGIN` | vault origin binding | Set to `1` to disable origin binding on credential fills (off by default). Removes the anti-phishing guard that refuses a fill on any origin other than the credential's bound one — only for trusted automation. |

### MCP config example

```json
{
  "mcpServers": {
    "fuse-browser": {
      "command": "npx",
      "args": ["-y", "@fusengine/browser-mcp"],
      "env": {
        "FUSE_ENGINE": "patchright",
        "FUSE_CHANNEL": "chrome",
        "FUSE_HEADLESS": "true",
        "FUSE_COUNTRY": "CH",
        "FUSE_CURRENCY": "CHF",
        "FUSE_OUTPUT_DIR": "/path/to/artifacts",
        "FUSE_PROXIES": "http://user:pass@host1:8080,http://user:pass@host2:8080"
      }
    }
  }
}
```

## Retry

`RetryConfig` (`src/interfaces/net.ts`) controls navigation resilience. Pass a partial object via `retry`; unset keys keep their defaults.

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `maxAttempts` | `number` | `3` | Maximum navigation attempts. `1` disables retry. |
| `baseMs` | `number` | `300` | Base backoff in ms (full-jitter exponential). |
| `capMs` | `number` | `10000` | Backoff ceiling in ms. |
| `throttleMs` | `number` | `0` | Minimum gap between hits on the same host in ms. `0` disables throttling. |

Backoff uses **full-jitter exponential** delay and honors a server `Retry-After` header when present. `throttleMs` enforces a minimum per-host gap between requests.

## Circuit breaker

Opt-in (`circuitBreaker`, off unless provided). For mass scraping: after N **consecutive** failures on an origin (`scheme://host:port`), the circuit **opens** and further attempts to that host **fail fast** for a cooldown — `browser_probe` returns `Circuit open for <origin>: retry in Ns`, `browser_serp_batch` records it as a per-query error row — instead of burning browser time on a dead host. After the cooldown a single **half-open** trial is allowed; success closes the circuit, failure reopens it with an **exponentially growing** cooldown (×2, capped). State is per-host, in-memory, single-process (LRU-bounded to 2000 hosts).

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `threshold` | `number` | `5` | Consecutive failures on a host before the circuit opens. |
| `cooldownMs` | `number` | `30000` | First cooldown once open (ms). |
| `capMs` | `number` | `600000` | Ceiling for the exponential reopen backoff (ms). |

Only **thrown** navigation failures (connection errors, timeouts) trip the breaker. HTTP `4xx`/`5xx`/`429` responses do **not** — they are returned, not thrown, so a `429` is treated as rate-limiting (handled by retry/`Retry-After`), not a host outage.

## Probe queue

Opt-in (`probeQueue`, off unless provided). For mass scraping, caps how many **browser** probes run at once and, optionally, the total per process — so a fleet of agents can't exhaust RAM by launching unbounded Chromium instances. Only the browser path is gated; the HTTP fast-path (`browser_fetch`, `fastPathFirst`) bypasses the queue.

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `concurrency` | `number` | `2` | Max browser probes running at once. |
| `maxQueue` | `number` | `8` | Max callers waiting for a slot; beyond this, fail fast. |
| `maxProbes` | `number` | `0` | Max probes admitted per process lifetime. `0` = unlimited. |

Excess callers wait **FIFO** for a slot. When the waiting list is full, `browser_probe` returns **`Probe queue full …`** (`QueueFullError`, transient — retry shortly). When the per-process budget is spent it returns **`Probe budget exhausted …`** (`BudgetExhaustedError`, terminal — start a new process). State is single-process and in-memory.

## Output location

`outputDir` defaults to a directory chosen by `resolveDefaultOutputDir` (`src/lib/output-dir.ts`):

- If the current working directory contains a known host-agent config dir, artifacts go under `<agent-dir>/fuse-browser`. Detected dirs, in order of preference: `.claude`, `.cursor`, `.codex`, `.windsurf`, `.gemini`, `.continue`, `.junie`, `.github`.
- Otherwise, artifacts go under `~/.fuse-browser`.

The output directory holds:

- `reports/` — probe reports
- screenshots
- `site-memory/` — per-site memory (`siteMemoryDir`)
- `replay/` — action replay artifacts (`replayDir`)

> **Security warning:** Reports and the `storageState` file contain **cookies and session tokens in clear text**. Keep `outputDir` out of version control — the default locations are gitignored. Never commit reports or storage-state files.
