/**
 * Types for Google SERP parsing and rank tracking.
 * @module interfaces/serp
 */

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

/** One query's outcome in a SERP batch. */
export interface SerpBatchRow {
  query: string;
  rank?: DomainRank;
  results: SerpResult[];
  error?: string;
}
