# fuse-browser documentation

Full reference for [`@fusengine/browser-mcp`](https://www.npmjs.com/package/@fusengine/browser-mcp).
New here? Start with the root [README](../README.md), then dive in:

| Doc | What's inside |
| --- | --- |
| [Installation](./installation.md) | Requirements, install, Chromium, MCP registration, the three ways to get a browser |
| [CLI](./cli.md) | `probe` / `fetch` / `serp-batch` / `shots` + every flag |
| [MCP tools](./mcp-tools.md) | All 32 tools with parameters and examples |
| [Configuration](./configuration.md) | `AgentOptions`, `FUSE_*` env vars, identity, retry, output location |
| [Sessions](./sessions.md) | Session lifecycle, auto crash recovery, `storageState` auto-save, HAR record/replay, CDP attach |
| [Extraction](./extraction.md) | `browser_extract` / `extract_schema` / `collect` + the clean→validate→dedupe→emit pipeline |
| [Anti-bot & proxies](./anti-bot.md) | Stealth, proxy pool, WebRTC guard, HTTP fast-path, captcha solver, honest limits |
| [Library](./library.md) | Programmatic `BrowserAgent` API |
