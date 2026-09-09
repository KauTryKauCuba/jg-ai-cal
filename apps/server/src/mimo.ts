import { EXTRACTION_PROMPT } from "./prompts.js";
import { resizeBase64PngToMaxDimension } from "./image.js";
import { isResumeFalse, safeJsonParse } from "./json.js";
import { calculateMimoCostUsd } from "./pricing.js";
import type { ProviderResult } from "./types.js";

const MIMO_API_URL = "https://api.xiaomimimo.com/v1/chat/completions";
const MODEL = "mimo-v2.5";
// MiMo bills proportionally to pixel resolution; cap the long edge to keep
// resume text legible while avoiding the token blowup seen at full resolution.
const MAX_IMAGE_DIMENSION = 1600;

interface MimoUsage {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

export async function extractResumeFromImages(
  base64Images: string[]
): Promise<ProviderResult> {
  const startedAt = Date.now();
  try {
    const apiKey = process.env.MIMO_API_KEY;
    if (!apiKey) {
      throw new Error("MIMO_API_KEY is not set");
    }

    // "detail":"high" was tried for parity with DeepSeek, but on real content-rich
    // images it drove MiMo's token usage (and latency/cost) up dramatically —
    // far more than it affected DeepSeek or Groq. Downscaling instead.
    const resizedImages = await Promise.all(
      base64Images.map((base64) =>
        resizeBase64PngToMaxDimension(base64, MAX_IMAGE_DIMENSION)
      )
    );
    const imageContent = resizedImages.map((base64) => ({
      type: "image_url" as const,
      image_url: { url: `data:image/png;base64,${base64}` },
    }));

    const response = await fetch(MIMO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        thinking: { type: "disabled" },
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: EXTRACTION_PROMPT }, ...imageContent],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`MiMo API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
      usage: MimoUsage;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("MiMo response had no content");
    }

    let json: any;
    try {
      json = safeJsonParse(content);
    } catch {
      throw new Error(`MiMo response was not valid JSON: ${content}`);
    }

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const cachedTokens = data.usage.prompt_tokens_details?.cached_tokens ?? 0;
    const costUsd = calculateMimoCostUsd(inputTokens, outputTokens, cachedTokens);
    const durationMs = Date.now() - startedAt;

    if (isResumeFalse(json.is_resume)) {
      return {
        provider: "mimo",
        isResume: false,
        reason: json.reason ?? "Uploaded document does not appear to be a resume.",
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
      };
    }

    return {
      provider: "mimo",
      isResume: true,
      data: json,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
    };
  } catch (err) {
    return {
      provider: "mimo",
      isResume: false,
      costUsd: 0,
      durationMs: Date.now() - startedAt,
      error: (err as Error).message,
    };
  }
}
