# Installation

`@fusengine/browser-mcp` (fuse-browser) is an MCP server and CLI that gives AI agents a real, stealth browser built on [Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright-nodejs) with a Playwright fallback.

## Requirements

| Item | Detail |
| --- | --- |
| **Node.js** | `>= 20` (runtime) |
| **Bun** | Dev toolchain only |
| **Chromium** | Installed **automatically** on `npm install` via a soft postinstall (non-fatal — CI / offline safe) |

The postinstall download can be skipped with either env var:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1   # or
FUSE_SKIP_BROWSER_DOWNLOAD=1
```

If the auto-install fails or was skipped, install Chromium manually:

```bash
npx patchright install chromium    # stealth engine (default)
npx playwright install chromium     # fallback engine
```

## Install

Global CLI — provides two binaries, `fuse-browser` and `browser-mcp`:

```bash
npm i -g @fusengine/browser-mcp
```

As a library:

```bash
npm i @fusengine/browser-mcp
```

## Register as MCP server

Register the published server (user scope = all projects):

```bash
claude mcp add fuse-browser --scope user -- npx -y @fusengine/browser-mcp
```

Or add it manually to your MCP config:

```json
{
  "mcpServers": {
    "fuse-browser": { "command": "npx", "args": ["-y", "@fusengine/browser-mcp"] }
  }
}
```

## Three ways to get a browser

| Mode | How | Use |
| --- | --- | --- |
| **Bundled** | default | Downloaded stealth Chromium (Patchright) |
| **Installed** | `channel: "chrome" \| "msedge"` | The Chrome/Edge installed on the machine |
| **Attach (CDP)** | `cdpEndpoint` or `browser_connect` | Drive an already-running browser — **Chrome, Edge, Dia, Arc, Brave** — using the user's real session |

`browser_connect` launches an installed browser with a remote-debugging port and attaches to it automatically. Verified end-to-end against **Dia** (Chromium 148).

## Next steps

- [CLI](./cli.md)
- [MCP tools](./mcp-tools.md)
- [Configuration](./configuration.md)
- [Sessions](./sessions.md)
- [Extraction](./extraction.md)
- [Anti-bot](./anti-bot.md)
- [Library](./library.md)
