/**
 * Types for data extracted from a page (prices, offers, challenges, visual).
 * @module interfaces/extraction
 */

/** A price detected in the page text. */
export interface Price {
  currency: string;
  amount: number;
  line: string;
  lineNo: number;
  /**
   * Best-effort short context label for the price: the nearest significant
   * non-price neighbouring line (e.g. "2 nights, 2 adults", "Tickets from",
   * or a product title). Optional and back-compatible.
   */
  context?: string;
}

/** An aggregated hotel offer (provider + price). */
export interface HotelOffer {
  provider: string;
  currency: string;
  amount: number;
}

/** Hotel offers summary (Google Hotels style). */
export interface HotelOffers {
  headline: { currency: string; amount: number } | null;
  options: HotelOffer[];
  bestTotal: HotelOffer | null;
}

/** Anti-bot / auth challenge detection. */
export interface Challenges {
  captcha: boolean;
  turnstile: boolean;
  hcaptcha: boolean;
  cloudflare: boolean;
  login: boolean;
  otp: boolean;
}

/** An interactive element observed visually. Optional fields enrich snapshots. */
export interface InteractiveElement {
  index: number;
  /** Frame-scoped ref for targeting: `"<frame>:<local>"`, or `"<local>"` for the main frame. */
  ref?: string;
  /** Owning frame ordinal in `page.frames()` (omitted for the main frame). */
  frame?: number;
  tag: string;
  text: string;
  role: string | null;
  id: string | null;
  name: string | null;
  type: string | null;
  href: string | null;
  visible: boolean;
  box: { x: number; y: number; width: number; height: number };
  value?: string | null;
  placeholder?: string | null;
  disabled?: boolean;
  checked?: boolean;
  options?: string[];
  ariaExpanded?: string | null;
  ariaControls?: string | null;
  obscured?: boolean;
  /** Robust, reusable CSS selector (only when snapshot is asked for `selectors`). */
  selector?: string | null;
}

/** A row harvested from a (possibly virtualized) list via scroll-collect. */
export interface CollectedItem {
  key: string;
  text: string;
  url: string | null;
  prices?: Price[];
}

/** Visual observation (screenshot + interactive elements). */
export interface Visual {
  screenshotPath?: string;
  viewport?: { width: number; height: number };
  interactiveElements?: InteractiveElement[];
}

export type { DomainRank, Serp, SerpBatchRow, SerpResult } from "./serp.js";
