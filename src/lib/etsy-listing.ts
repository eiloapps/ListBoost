import { z } from "zod";

export const PRODUCT_TYPES = [
  { label: "Art Prints", value: "art-prints" },
  { label: "Posters", value: "posters" },
  { label: "Mugs", value: "mugs" },
  { label: "T-Shirts", value: "t-shirts" },
  { label: "Stickers", value: "stickers" },
  { label: "Jewelry", value: "jewelry" },
  { label: "Clothing", value: "clothing" },
  { label: "Home Decor", value: "home-decor" },
  { label: "Accessories", value: "accessories" },
  { label: "Pottery", value: "pottery" },
  { label: "Candles", value: "candles" },
  { label: "Digital Products", value: "digital-products" },
  { label: "Other", value: "other" },
] as const;

export const STYLES = ["Minimalist", "Boho", "Vintage", "Modern", "Rustic", "Elegant", "Cottagecore", "Industrial"] as const;
export const TONES = ["Professional", "Friendly", "Playful", "Luxurious", "Casual", "Warm"] as const;

export const ProductTypeValues = PRODUCT_TYPES.map((item) => item.value);

export const GeneratedListingSchema = z.object({
  seo_title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).length(13),
});

export const RawGeneratedListingSchema = z.object({
  seo_title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
});

export const GenerateListingRequestSchema = z.object({
  productType: z.string().min(1),
  style: z.string().optional().default(""),
  targetAudience: z.string().optional().default(""),
  occasion: z.string().optional().default(""),
  keywords: z.string().optional().default(""),
  tone: z.string().optional().default(""),
  imageFilename: z.string().optional().default(""),
  imageDataUrl: z.string().optional().default(""),
});

export type GeneratedListing = z.infer<typeof GeneratedListingSchema>;
export type RawGeneratedListing = z.infer<typeof RawGeneratedListingSchema>;
export type GenerateListingRequest = z.infer<typeof GenerateListingRequestSchema>;

export const PRODUCT_TYPE_LABELS = PRODUCT_TYPES.reduce<Record<string, string>>((accumulator, item) => {
  accumulator[item.value] = item.label;
  return accumulator;
}, {});

const clampText = (value: string, maxLength: number) => value.trim().slice(0, maxLength).trim();

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const trimIncompleteTrailingWord = (value: string) => {
  const trimmed = value.trim();
  const lastSpace = trimmed.lastIndexOf(" ");

  if (trimmed.length <= 20 || lastSpace < 8) {
    return trimmed;
  }

  return trimmed.slice(0, lastSpace).trim();
};

const normalizeTag = (value: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= 20) {
    return normalized;
  }

  return trimIncompleteTrailingWord(clampText(normalized, 20));
};

export const fallbackTagsForProductType = (productType: string) => {
  const label = (PRODUCT_TYPE_LABELS[productType] ?? "etsy item").toLowerCase();

  return [
    label,
    `${label} gift`,
    `handmade ${label}`,
    `etsy ${label}`,
    `${label} decor`,
    `gift for her`,
    `gift for him`,
    `small business`,
    `shop gift idea`,
    `custom ${label}`,
    `unique ${label}`,
    `giftable ${label}`,
    `trending ${label}`,
  ];
};

export const sanitizeGeneratedListing = (value: RawGeneratedListing, productType: string): GeneratedListing => {
  const title = clampText(normalizeWhitespace(value.seo_title), 140);
  const description = value.description.trim();

  const dedupedTags: string[] = [];
  const seen = new Set<string>();

  for (const tag of value.tags) {
    if (dedupedTags.length >= 13) {
      break;
    }
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    dedupedTags.push(normalized);
  }

  for (const fallbackTag of fallbackTagsForProductType(productType)) {
    if (dedupedTags.length >= 13) {
      break;
    }
    const normalized = normalizeTag(fallbackTag);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    dedupedTags.push(normalized);
  }

  if (!title || title.length > 140 || !description || dedupedTags.length !== 13 || dedupedTags.some((tag) => tag.length > 20)) {
    throw new Error("Generated listing failed validation.");
  }

  return {
    seo_title: title,
    description,
    tags: dedupedTags,
  };
};
