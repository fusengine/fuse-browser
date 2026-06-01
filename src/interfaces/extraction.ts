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

/** An interactive element observed visually. */
export interface InteractiveElement {
  index: number;
  tag: string;
  text: string;
  role: string | null;
  id: string | null;
  name: string | null;
  type: string | null;
  href: string | null;
  visible: boolean;
  box: { x: number; y: number; width: number; height: number };
}

/** Visual observation (screenshot + interactive elements). */
export interface Visual {
  screenshotPath?: string;
  viewport?: { width: number; height: number };
  interactiveElements?: InteractiveElement[];
}

/** A single Google SERP entry (organic result or ad). */
export interface SerpResult {
  position: number;
  title: string;
  url: string;
  displayUrl?: string;
  snippet?: string;
}

/** Where a domain ranks within a SERP. */
export interface DomainRank {
  domain: string;
  organic: number[];
  ads: number[];
  best: number | null;
  found: boolean;
}

/** Parsed Google search results page. */
export interface Serp {
  organic: SerpResult[];
  ads: SerpResult[];
  related: string[];
  rank?: DomainRank;
}
