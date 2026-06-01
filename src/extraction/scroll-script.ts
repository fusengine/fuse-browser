/**
 * Browser-side scripts for virtualized/infinite lists: detect the scrollable
 * container (explicit selector or auto by overflow + scrollHeight), scroll it,
 * and harvest the currently-mounted rows. Runs in the page context.
 * @module extraction/scroll-script
 */

/** Container picker: explicit `sel`, else the tallest overflow:auto/scroll element. */
const FINDER = `
  const pick = (sel) => {
    if (sel) return document.querySelector(sel);
    let best = null, bestH = 0;
    for (const el of document.querySelectorAll('*')) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
          el.scrollHeight > el.clientHeight + 4 && el.clientHeight > innerHeight * 0.3 &&
          el.scrollHeight > bestH) { best = el; bestH = el.scrollHeight; }
    }
    return best || document.scrollingElement || document.documentElement;
  };`;

/** Stable key for a row: data-id › data-key › first href › trimmed text. */
const KEYER = `
  const keyOf = (el) => (el.getAttribute('data-id') || el.getAttribute('data-key') ||
    (el.querySelector('a[href]') && el.querySelector('a[href]').href) ||
    (el.textContent || '').replace(/\\s+/g,' ').trim().slice(0, 120));`;

/** Scroll the (auto-detected or `selector`) container; `to:"end"` jumps to bottom. */
export const SCROLL_SCRIPT = `(arg) => {${FINDER}
  const el = pick(arg.selector);
  if (!el) return { found: false };
  el.style.overflowAnchor = 'none';
  const before = el.scrollTop;
  if (arg.to === 'end') el.scrollTop = el.scrollHeight;
  else el.scrollTop += (arg.delta || Math.floor(el.clientHeight * 0.9));
  return { found: true, scrollTop: el.scrollTop, scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight, moved: el.scrollTop - before,
    atEnd: el.scrollTop + el.clientHeight >= el.scrollHeight - 4 };
}`;

/** Harvest visible `item` rows, then scroll the container one step. */
export const SCAN_SCRIPT = `(arg) => {${FINDER}${KEYER}
  const el = pick(arg.selector);
  const rows = [...document.querySelectorAll(arg.item)].slice(0, 500).map((r) => {
    const a = r.querySelector('a[href]');
    return { key: keyOf(r), text: (r.textContent || '').replace(/\\s+/g,' ').trim().slice(0, 300), url: a ? a.href : null };
  });
  let geo = { moved: 0, atEnd: true, scrollHeight: 0, clientHeight: 0, scrollTop: 0 };
  if (el) {
    el.style.overflowAnchor = 'none';
    const before = el.scrollTop;
    el.scrollTop += Math.floor(el.clientHeight * (arg.stepFraction || 0.9));
    geo = { moved: el.scrollTop - before, scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight, scrollTop: el.scrollTop,
      atEnd: el.scrollTop + el.clientHeight >= el.scrollHeight - 4 };
  }
  return { items: rows, geo };
}`;
