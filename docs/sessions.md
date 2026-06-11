# Sessions

A **session** is a live browser context + page kept alive between MCP calls. Most tools accept inline options and open/close a throwaway context per call; sessions let you keep one open and reuse it (log in once, navigate, extract, all against the same page).

`browser_open` resolves the options into a config, opens a session, and returns its `sessionId` plus an `expiresAt` timestamp (and the resolved `identity`):

```json
{
  "sessionId": "a1b2c3d4e5f6",
  "expiresAt": 1733000300000,
  "identity": { "...": "..." }
}
```

Pass that `sessionId` to subsequent tools to keep working against the same page.

**Idle TTL.** Each session has an idle TTL (default **300_000 ms = 5 min**, `SessionManager` `ttlMs`). Every time a tool touches the session the TTL is refreshed (`expiresAt = now + ttlMs`); once it lapses with no activity, the session is auto-closed.

**Concurrency cap.** At most `maxSessions` sessions may be open at once (default **8**). Opening over the cap throws `SessionLimitError` — `Concurrent session limit reached: 8`.

---

## Crash recovery

A long-lived session can lose its page mid-run — a renderer crash (OOM), or the page being closed out from under it. fuse-browser tracks each session's liveness (`page.on('crash'|'close')`, `context.on('close')`, `browser.on('disconnected')`) and recovers **automatically**, with no new tool or option:

- **Page crashed, context alive** — the next tool call transparently recreates the page in the **same context**, so cookies, `storageState` and auth are preserved. Listeners and HAR replay are re-wired and the page is re-navigated to its last URL. Your tool call then runs as if nothing happened. If the page dies *during* a call, the session is healed and a recoverable error (`page_crashed: … retry your last action`) is returned so the agent re-issues its last step.
- **Browser/context gone** — unrecoverable within the session. The session is evicted and the call returns `session_lost: browser disconnected — reopen with browser_open`. Open a fresh session to continue.

The last visited URL is tracked continuously (main-frame navigations), so recovery lands you back on the page you were on. Recovery is silent on the happy path — it only engages once a crash/disconnect is observed.

---

## Lifecycle tools

| Tool | Purpose |
| --- | --- |
| `browser_open` | Open a persistent session; returns `{ sessionId, expiresAt, identity }`. Accepts the full agent option shape. |
| `browser_status` | With `sessionId`: status of one session (`{ sessionId, url, createdAt, expiresAt }`). Without it: lists all open sessions (`{ sessionId, url, expiresAt }` each). |
| `browser_close` | Close one session by `sessionId`; returns `{ closed: true|false }` (`false` if it did not exist). |
| `browser_connect` | Attach to an installed browser over CDP (see below). |

**Auto-close on TTL.** When the idle TTL expires the manager closes the session itself (same teardown path as `browser_close`). Any subsequent call with that `sessionId` throws `SessionNotFoundError`. On server shutdown all sessions are closed (`closeAll`).

---

## storageState (cookies + localStorage)

Set `storageStatePath` to persist Playwright **storage state** — cookies *and* `localStorage` — across runs:

- **Restore at open** — if the file at `storageStatePath` exists when the session opens, it is loaded as the context's `storageState` (`launch.ts`). If it does not exist, the session opens clean.
- **Auto-save on close** — on `closeSession`, the current cookies + localStorage are written back to `storageStatePath` (the parent directory is created if needed). This is best-effort and never blocks teardown.

> Only applies to **ephemeral (launched) sessions**. It is skipped for CDP-attached (`connected`) sessions and is independent of `userDataDir`.

```jsonc
// First run: open, log in once — state is saved on close
browser_open  { "storageStatePath": "./.auth/site.json" }
// ... browser_login / browser_fill against the returned sessionId ...
browser_close { "sessionId": "<id>" }

// Next run: open reuses the saved cookies + localStorage — already logged in
browser_open  { "storageStatePath": "./.auth/site.json" }
```

> **Shorthand:** the `profile` option names a persistent auth profile (`profile: "github"` ⇒ `storageStatePath` at `~/.fuse-browser/profiles/github.json`). It is ignored when `storageStatePath` is set explicitly — see [configuration](./configuration.md).

---

## Dialogs & downloads (auto-attached)

Every session is wired for native dialogs and downloads **at open** (and re-wired after [crash recovery](#crash-recovery)) — no setup call needed:

- **Dialogs** — `alert`/`confirm`/`prompt`/`beforeunload` are handled by a per-session policy so they never block a run. The default policy is **dismiss**; change it with `browser_dialog` (`accept`/`dismiss`, optional `promptText` for prompts), which also returns the last observed dialogs (max 20).
- **Downloads** — every download is saved under `<outputDir>/downloads/<suggestedFilename>` (suffixing `-1`, `-2` on collisions). List them with `browser_downloads` (`{ url, suggestedFilename, path, at, error? }` each).

See [MCP tools](./mcp-tools.md#browser_dialog) for the parameters.

---

## HAR record / replay

HAR (HTTP Archive) lets you record network traffic to a file and later replay it offline.

**Record** — set `harPath` to capture traffic for the session's context. Optional `harMode` controls fidelity:

- `"minimal"` (default) — request/response metadata only.
- `"full"` — includes response bodies.

The HAR is flushed to disk when the context closes (so close the session before reading the file).

```jsonc
browser_open  { "harPath": "./fixtures/site.har", "harMode": "full" }
// ... navigate / extract against the sessionId ...
browser_close { "sessionId": "<id>" }   // HAR flushed here
```

**Replay** — set `harReplay` to serve responses from a recorded HAR offline. The page is wired through Playwright's `routeFromHAR` with `notFound: "fallback"`, so requests missing from the HAR fall back to the live network rather than failing.

```jsonc
browser_open    { "harReplay": "./fixtures/site.har" }
browser_navigate{ "sessionId": "<id>", "url": "https://site.example/page" }  // served from HAR
```

Use record/replay for deterministic CI fixtures and offline re-extraction.

---

## Persistent profile

Set `userDataDir` to launch a **persistent Chromium profile** rooted at that directory (created if missing). The browser is launched via `launchPersistentContext`, so cookies, localStorage, and other profile data persist across runs through the profile directory itself — no `storageStatePath` needed.

```jsonc
browser_open { "userDataDir": "./.profiles/work" }
```

A persistent context has no separate `browser` handle; closing the session closes the persistent context.

---

## CDP attach (`browser_connect`)

`browser_connect` drives the user's **real, installed** browser by attaching over the Chrome DevTools Protocol. It launches the chosen browser with `--remote-debugging-port`, waits for the CDP endpoint, then opens an attached session (`chromium.connectOverCDP`).

| Param | Type | Notes |
| --- | --- | --- |
| `browser` | `"dia" \| "chrome" \| "edge" \| "brave" \| "arc"` | Resolved to a known executable path. |
| `executablePath` | `string` | Explicit binary; overrides `browser`. |
| `port` | `int` | Remote-debugging port (default **9222**). |
| `userDataDir` | `string` | Profile directory passed to the launched browser. |
| `launch` | `boolean` | `false` = **attach-only** to an already-running browser started with `--remote-debugging-port` (does not spawn a new one). Default behavior spawns the browser. |

Returns `{ sessionId, endpoint, url, connected }`.

```jsonc
// Launch Chrome with debugging and attach
browser_connect { "browser": "chrome", "port": 9222 }

// Attach to a browser the user already started with --remote-debugging-port=9222
browser_connect { "launch": false, "port": 9222 }
```

**Close = detach only.** On a CDP-attached session, `browser_close` (and TTL auto-close) only drop the connection — the user's browser and its default context are **never** closed. storageState auto-save is also skipped for these sessions.

> **Security.** A remote-debugging port is a local attack surface: any process that can reach that port can fully control the browser (read cookies, navigate, exfiltrate session tokens). Only enable it on a trusted machine, prefer the default loopback binding, and close the browser when done.
