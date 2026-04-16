const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart =
  | {
      text: string;
    }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    };

export async function generateGeminiJson({
  apiKey,
  model,
  parts,
  schema,
}: {
  apiKey: string;
  model: string;
  parts: GeminiPart[];
  schema: Record<string, unknown>;
}) {
  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => typeof part.text === "string")?.text;

  if (!text || typeof text !== "string") {
    throw new Error("Gemini returned an empty or invalid response.");
  }

  return JSON.parse(text);
}
