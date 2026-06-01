# Extraction

Tools for pulling structured data out of a live browser session. Three entry
points: `browser_extract` (heuristic text/prices/hotels/challenges),
`browser_extract_schema` (deterministic CSS-driven typed extraction), and
`browser_collect` (exhaust a virtualized/infinite list, with an optional
post-processing pipeline). All read the **rendered DOM**, so they work on
Next.js/SPA pages after hydration.

## browser_extract

Heuristic extraction from the current page. Params: `sessionId`, optional
`kind`.

`kind` is one of `text | prices | hotels | challenges | all` (default `all`).
The result always includes `url`; the rest depends on `kind`:

| `kind` | Returned fields |
|--------|-----------------|
| `text` | `text` — the page main text (boilerplate-stripped) |
| `prices` | `prices` — `Price[]` (multi-currency) **and** `hotelOffers` — `HotelOffers` |
| `hotels` | `hotelOffers` — `HotelOffers` |
| `challenges` | `challenges` — `Challenges` (anti-bot / auth detection) |
| `all` | `text`, `prices`, `hotelOffers`, **and** `challenges` |

Shapes:

```ts
interface Price { currency: string; amount: number; line: string; lineNo: number }

interface HotelOffer { provider: string; currency: string; amount: number }
interface HotelOffers {
  headline: { currency: string; amount: number } | null;
  options: HotelOffer[];
  bestTotal: HotelOffer | null;
}

interface Challenges {
  captcha: boolean; turnstile: boolean; hcaptcha: boolean;
  cloudflare: boolean; login: boolean; otp: boolean;
}
```

Example:

```json
{ "sessionId": "s1", "kind": "prices" }
```

```json
{
  "url": "https://example.com/hotel",
  "prices": [{ "currency": "CHF", "amount": 240, "line": "CHF 240 / night", "lineNo": 12 }],
  "hotelOffers": { "headline": { "currency": "CHF", "amount": 240 }, "options": [], "bestTotal": null }
}
```

## browser_extract_schema

Deterministic, typed extraction by CSS selector — no LLM. Params: `sessionId`
and `schema`, a record of `fieldName -> { selector, attr?, all?, abs? }`.

Field spec:

| Key | Meaning |
|-----|---------|
| `selector` | CSS selector locating the element(s). |
| `attr` | Read this attribute instead of text. Omit to read trimmed `innerText`. |
| `all` | When `true`, return an **array** of all `querySelectorAll` matches instead of the first match. |
| `abs` | When `true` **and** `attr` is set, read the element's IDL property (e.g. `el.href`) — which the browser resolves to an absolute URL — instead of the raw attribute string. Has no effect without `attr`. |

Read rules per field:
- `attr` + `abs` → `el[attr]` (absolutized, e.g. `el.href`).
- `attr` only → `el.getAttribute(attr)` (raw value).
- neither → trimmed `innerText`, or `null` if empty.
- A missing element or invalid selector yields `null` (caught per field).

The result is `{ url, data }` where `data` maps each field name to a `string`,
`null`, or (with `all`) an array thereof.

Example schema:

```json
{
  "sessionId": "s1",
  "schema": {
    "title":   { "selector": "h1" },
    "price":   { "selector": ".price" },
    "links":   { "selector": "a.card", "attr": "href", "abs": true, "all": true },
    "thumb":   { "selector": "img.hero", "attr": "src", "abs": true }
  }
}
```

Returned:

```json
{
  "url": "https://example.com/list",
  "data": {
    "title": "Listings",
    "price": "CHF 240",
    "links": ["https://example.com/a", "https://example.com/b"],
    "thumb": "https://example.com/hero.jpg"
  }
}
```

## browser_collect

Exhaust a virtualized or infinite list by scrolling its container and merging
the rows mounted along the way — perceiving items beyond the first screen that a
single snapshot misses (hotel/flight results, feeds).

Params:

| Param | Default | Meaning |
|-------|---------|---------|
| `sessionId` | — | session id |
| `item` | — | CSS selector for **one row** |
| `container` | auto-detected | scroll container; inferred from rows when omitted |
| `maxSteps` | `60` | scroll-step cap |
| `extractPrices` | `false` | run the price extractor on each row's text |
| `pipeline` | — | optional post-processing (see [Pipeline](#pipeline)) |

Without a pipeline, returns:

```ts
{
  count: number;          // number of unique rows
  steps: number;          // scroll iterations performed
  reachedEnd: boolean;    // true if the list bottom was reached (vs. maxSteps cap)
  items: CollectedItem[];
}

interface CollectedItem {
  key: string;
  text: string;
  url: string | null;
  prices?: Price[];       // present when extractPrices is true
}
```

### Returns DATA, not refs

`browser_collect` returns **data** (`key`/`text`/`url`/`prices`), not actionable
element references. Virtualization recycles DOM nodes as you scroll, so any ref
captured mid-scroll would be stale. To act on a discovered row:

- `browser_act` targeting the row by its **text**, or
- `browser_scroll(selector)` to bring it back into view, then `browser_snapshot`
  to obtain fresh refs.

## Pipeline

The optional `pipeline` argument on `browser_collect` applies composable,
order-fixed post-processing to the collected rows: **clean → validate → dedupe →
columns → emit**. Every stage is optional and pure.

### clean

`{ numericFields?: string[] }` — normalizes **every** string field (decode HTML
entities, strip zero-width characters, collapse whitespace) and parses messy
numbers on the listed `numericFields`. The number parser handles formats like
`€1,234.56`, `1 234,56`, and `CHF 1'234.50`: the decimal separator is the last
`.`/`,` followed by 1-2 digits, the rest are treated as thousands separators.
A field that parses cleanly is replaced by the numeric value; unparseable values
are left as the normalized string.

### validate

`Record<field, { required?, type?, regex?, min?, max?, enum? }>` — per-field
rules. `type` is `string | number | boolean`; `min`/`max` apply only to numbers;
`regex` is a string compiled at run time and tested against string values;
`enum` is a list of allowed values. Rows with **any** failing field are moved out
of `items` and counted in `invalidCount`.

### dedupeBy

`string[]` — collapse rows sharing a composite key built from these fields
(lowercased, trimmed, space-joined). Pair with **`keep`**: `"first" | "last"`
(default `"first"`) to choose which duplicate survives.

### columns

`string[]` — restrict output rows to this subset of columns, in the given order.

### emit

`"json" | "csv"` (default `"json"`). With `"csv"`, the response gains a `csv`
field rendered per RFC 4180 (CRLF line endings, fields quoted as needed, array
cells joined with `;`). The CSV header is `columns` if provided, otherwise the
keys of the first row.

### Full example

```json
{
  "sessionId": "s1",
  "item": ".result-card",
  "extractPrices": true,
  "pipeline": {
    "clean":    { "numericFields": ["amount"] },
    "validate": { "amount": { "required": true, "type": "number", "min": 1 } },
    "dedupeBy": ["key"],
    "keep":     "first",
    "columns":  ["key", "text", "amount"],
    "emit":     "csv"
  }
}
```

Returned shape:

```ts
{
  count: number;          // valid rows after the pipeline
  steps: number;
  reachedEnd: boolean;
  invalidCount: number;   // rows dropped by validate
  items: Record<string, unknown>[];
  csv: string;            // present only when emit === "csv"
}
```

> Note: when a pipeline is supplied, `items` are the processed plain-object rows
> (subject to `columns`), not `CollectedItem`s. `invalidCount` and `csv` appear
> only on the pipeline path.

## Multi-currency prices

Price extraction uses a single multi-currency extractor (`extractPrices`). It
recognizes ISO codes and symbols for CHF, CAD, AUD, NZD, SGD, HKD, BRL, MXN,
GBP, EUR, JPY, CNY, KRW, INR, AED, SAR, NOK, SEK, DKK, PLN, CZK, ILS, ZAR, and
USD (the bare `$` resolves to USD last). It skips numeric ranges (e.g. `20–30`)
and irrelevant lines (restaurant, parking, breakfast…), and dedupes by
`currency + amount`. The same extractor backs `browser_extract`, the
`extractPrices` option of `browser_collect`, `browser_fetch`, and the pipeline
`clean` stage's number handling.
