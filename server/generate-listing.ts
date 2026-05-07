import { GenerateListingRequestSchema, PRODUCT_TYPE_LABELS, RawGeneratedListingSchema, sanitizeGeneratedListing } from "../src/lib/etsy-listing.js";
import { generateGeminiJson } from "./gemini.js";
import { buildGeminiEtsyUserPrompt, GEMINI_ETSY_SYSTEM_PROMPT } from "./prompts.js";

const LISTING_SCHEMA = {
  type: "object",
  properties: {
    seo_title: { type: "string" },
    description: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
      minItems: 13,
      maxItems: 13,
    },
  },
  required: ["seo_title", "description", "tags"],
} as const;

const dataUrlToInlineImage = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("Uploaded image data was invalid.");
  }

  return {
    mime_type: match[1],
    data: match[2],
  };
};

export async function generateListingWithAI(rawRequest: unknown) {
  const request = GenerateListingRequestSchema.parse(rawRequest);
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add it to your environment before generating listings.");
  }

  const productLabel = PRODUCT_TYPE_LABELS[request.productType] ?? request.productType;

  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
    {
      text: [
        GEMINI_ETSY_SYSTEM_PROMPT,
        "",
        buildGeminiEtsyUserPrompt({
          productType: productLabel,
          style: request.style,
          targetAudience: request.targetAudience,
          occasion: request.occasion,
          keywords: request.keywords,
          tone: request.tone,
        }),
        "",
        `IMAGE FILENAME: ${request.imageFilename || "Not provided"}`,
        "",
        "Important:",
        "- If the image is unclear, stay conservative.",
        "- If the image and selected product type conflict, trust the selected product type.",
        "- Use the image and filename as signals, but do not invent unsupported details.",
      ].join("\n"),
    },
  ];

  if (request.imageDataUrl) {
    parts.push({
      inline_data: dataUrlToInlineImage(request.imageDataUrl),
    });
  }

  const generated = await generateGeminiJson({
    apiKey,
    model,
    parts,
    schema: LISTING_SCHEMA,
  });

  const parsed = RawGeneratedListingSchema.parse(generated);
  return sanitizeGeneratedListing(parsed, request.productType);
}
