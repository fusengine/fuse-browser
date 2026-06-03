# Recipe — contact extraction (prospection)

Extract structured contacts (emails, phones in E.164, contact-form detection) from a
rendered page, optionally hunting the Contact/Impressum page when the home has none.
Everything is **opt-in**: without `extractContacts`, `probe()` behaves exactly as before.

> ⚠️ **Legal.** Harvesting personal data (emails, phone numbers) is regulated — GDPR (EU),
> nLPD/FADP (Switzerland), and the target site's Terms of Service and `robots.txt`. You alone
> are responsible for a lawful basis and lawful use of any data you collect. `fuse-browser` is
> a neutral, dual-use tool; use it only where you are permitted to. See [../../LEGAL.md](../../LEGAL.md).
>
> Set `respectRobots: true` to honor the target's `robots.txt` (opt-in — off by default).

## Library

```ts
import { BrowserAgent } from "@fusengine/browser-mcp";

const agent = new BrowserAgent({ countryCode: "CH" }); // default country for phone parsing
const report = await agent.probe("https://example.com", {
  extractContacts: true,
  contactCrawl: { enabled: true, maxPages: 3 }, // follow Contact/Impressum links if no email on the home
});

console.log(report.contacts);
// shape (illustrative placeholders — not real data):
// { emails: ["contact@example.com"], phones: ["+41000000000"], hasContactForm: true }
```

### How it works

1. **3 sources, deduped**, on the rendered DOM: `mailto:`/`tel:` hrefs (phones → E.164),
   regex over text + HTML, and deobfuscation (`x [at] y [dot] ch`, `&#64;`).
2. **Contact-hunt** (when `contactCrawl.enabled` and the page yields no email): follow
   same-domain links matching `contact|kontakt|impressum|mentions|a-propos|about`,
   bounded by `maxPages` (default 3), re-extract, and merge.
3. Phones are normalized to **E.164** with `libphonenumber-js`, using `countryCode` as the
   default region for national-format numbers.

### Cascade: `fastPathFirst` (HTTP first, browser only if needed)

```ts
const report = await agent.probe(url, { extractContacts: true, fastPathFirst: true });
// report.fastPath === true  → contacts came from the HTTP fast-path (~0.6s, no browser)
```

With `fastPathFirst`, the probe tries HTTP extraction first and **only launches the browser
when the card is incomplete** (no email *and* phone yet). On a static/SSR site you pay ~0.6s
instead of ~7s; SPAs still escalate to a full browser probe + `contactCrawl`. The returned
report carries `fastPath: true` and leaves browser-only fields (screenshot, network) empty.

## Over a remote browser (Browserless)

Combine with CDP attach — the probe drives the remote browser and closes the session when done:

```ts
const agent = new BrowserAgent({
  cdpEndpoint: "wss://chrome.browserless.io/playwright?token=YOUR_TOKEN",
  realisticProfile: true,
});
const report = await agent.probe(url, { extractContacts: true, contactCrawl: { enabled: true } });
```

## Over MCP (`browser_probe`)

The same options are accepted as `browser_probe` arguments (and the CDP remote options on any probe):

```jsonc
{
  "url": "https://example.com",
  "extractContacts": true,
  "contactCrawl": { "enabled": true, "maxPages": 3 },
  // optional remote browser:
  "cdpEndpoint": "wss://chrome.browserless.io/playwright",
  "cdpHeaders": { "Authorization": "Bearer YOUR_TOKEN" }
}
```

`report.contacts` is included in the compact tool result.

## Batch (bounded loop, not a batch class)

There is no batch primitive: loop `probe()` yourself, bounded by your own concurrency
(e.g. `SessionManager.maxSessions` when going through sessions), and collect `report.contacts`.

```ts
const urls = ["https://a.example", "https://b.example"];
const all = [];
for (const url of urls) {
  const r = await agent.probe(url, { extractContacts: true, contactCrawl: { enabled: true } });
  all.push({ url, ...r.contacts });
}
```
