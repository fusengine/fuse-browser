import { describe, expect, test } from "bun:test";
import { extractHotelOffers } from "../../src/extraction/hotel-offers.js";

describe("extractHotelOffers", () => {
  test("extracts headline, options and best total from visible lines", () => {
    const text = `ibis Lausanne Centre
CHF 129
31 May – 1 Jun
All options
ibis Lausanne Centre
 Official site
Member rate, save 9%
,
CHF 145
CHF 132
Visit site
trivago DEALS
CHF 129
Visit site
View more options from CHF 134
4 top things to know
CHF 12 more unrelated
`;
    const offers = extractHotelOffers(text);
    expect(offers.headline).toEqual({ currency: "CHF", amount: 129 });
    expect(offers.bestTotal).toEqual({ provider: "trivago DEALS", currency: "CHF", amount: 129 });
    expect(offers.options[0]?.provider).toBe("ibis Lausanne Centre Official site");
    expect(offers.options[0]?.amount).toBe(132);
  });
});
