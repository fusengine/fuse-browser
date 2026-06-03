# Legal & Responsible Use

`fuse-browser` is a **neutral, dual-use automation tool**, provided **as-is under MIT, without
warranty**. It does nothing unlawful by itself, and it **blocks nothing by default** — every
restriction is an explicit, opt-in choice you make.

## Your responsibility

**You alone are responsible** for how you use this tool and for complying with all applicable
law in your jurisdiction and the target's, including:

- the target site's **Terms of Service** and `robots.txt`;
- **data-protection law** — GDPR (EU), nLPD/FADP (Switzerland), and equivalents — whenever you
  collect personal data such as emails or phone numbers. You must have a **lawful basis**, a
  defined and limited purpose, and you must meet information, minimization and retention duties;
- **computer-misuse / anti-circumvention** rules when accessing systems you do not own or are
  not authorized to test;
- **intellectual-property and database rights** in the content you fetch.

## What the tool does NOT do for you

- It does **not** fetch or honor `robots.txt` unless you set `respectRobots: true` (opt-in).
- It does **not** establish a lawful basis for any personal data you choose to extract.
- The stealth features and the opt-in captcha solver are for **authorized testing only**, on
  systems you own or are permitted to test.

## Opt-in compliance levers

- **`respectRobots: true`** — honor the origin's `robots.txt`. An explicitly probed URL that is
  disallowed raises `RobotsDisallowed`; disallowed links are silently skipped during a crawl.
- **`extractContacts` / `contactCrawl`** — off by default; enable only with a lawful basis.
- Apply your **own rate limiting / concurrency** to avoid overloading a target service.

If you are unsure whether a use is lawful, seek legal advice before proceeding.
