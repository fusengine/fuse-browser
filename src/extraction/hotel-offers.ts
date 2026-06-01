/**
 * Hotel offers aggregation from visible page text (Google Hotels style).
 * @module extraction/hotel-offers
 */
import type { HotelOffer, HotelOffers } from "../interfaces/extraction.js";
import { parseSinglePrice } from "./prices.js";

const STOP_MARKERS = ["top things", "prices are currently", "show price range", "nearby places"];

/** Build an offer from a block of lines (provider + best price). */
function offerFromChunk(chunk: string[]): HotelOffer | null {
  const prices = chunk.map(parseSinglePrice).filter((p): p is NonNullable<typeof p> => p !== null);
  if (prices.length === 0) return null;
  const price = prices.reduce((a, b) => (b.amount < a.amount ? b : a));
  const providerLines = chunk.filter(
    (line) =>
      !parseSinglePrice(line) &&
      !line.startsWith(",") &&
      !line.toLowerCase().includes("save ") &&
      !line.toLowerCase().includes("free cancellation"),
  );
  let provider: string;
  if (providerLines.length >= 2 && providerLines[1]?.toLowerCase() === "official site") {
    provider = `${providerLines[0]} Official site`;
  } else {
    provider = providerLines[0] ?? "unknown";
  }
  return { provider, currency: price.currency, amount: price.amount };
}

/**
 * Extract the headline offer (before "All options") and the list of offers
 * (each block terminated by "Visit site"), plus the best total.
 */
export function extractHotelOffers(text: string): HotelOffers {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const allOptionsIndex = lines.includes("All options") ? lines.indexOf("All options") : lines.length;

  let headline: HotelOffers["headline"] = null;
  for (const line of lines.slice(0, allOptionsIndex)) {
    const price = parseSinglePrice(line);
    if (price) {
      headline = price;
      break;
    }
  }

  const options: HotelOffer[] = [];
  if (allOptionsIndex < lines.length) {
    let chunk: string[] = [];
    for (const line of lines.slice(allOptionsIndex + 1)) {
      if (STOP_MARKERS.some((m) => line.toLowerCase().includes(m))) break;
      if (line === "Visit site") {
        const offer = offerFromChunk(chunk);
        if (offer) options.push(offer);
        chunk = [];
      } else if (line.startsWith("View more options")) {
        break;
      } else {
        chunk.push(line);
      }
    }
  }

  const bestTotal = options.length > 0 ? options.reduce((a, b) => (b.amount < a.amount ? b : a)) : null;
  return { headline, options, bestTotal };
}
