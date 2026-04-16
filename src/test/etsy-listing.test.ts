import { describe, expect, it } from "vitest";
import { sanitizeGeneratedListing } from "@/lib/etsy-listing";

describe("sanitizeGeneratedListing", () => {
  it("pads and normalizes tags to exactly 13", () => {
    const listing = sanitizeGeneratedListing(
      {
        seo_title: "  Handmade Art Print Gift for Gallery Wall  ",
        description: "A detailed description",
        tags: ["Art Print", "Art Print", " Gallery Wall "],
      },
      "art-prints",
    );

    expect(listing.seo_title).toBe("Handmade Art Print Gift for Gallery Wall");
    expect(listing.tags).toHaveLength(13);
    expect(new Set(listing.tags).size).toBe(13);
  });
});
