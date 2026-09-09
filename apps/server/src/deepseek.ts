import { EXTRACTION_PROMPT } from "./prompts.js";
import { isResumeFalse, safeJsonParse } from "./json.js";
import { calculateDeepSeekCostUsd } from "./pricing.js";
import type { ProviderResult } from "./types.js";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-v4-flash-vision-exp";

interface DeepSeekUsage {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

export async function extractResumeFromImages(
  base64Images: string[]
): Promise<ProviderResult> {
  const startedAt = Date.now();
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not set");
    }

    const imageContent = base64Images.map((base64) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/png;base64,${base64}`,
        detail: "high" as const,
      },
    }));

    const response = await fetch(DEEPSEEK_API_URL, {
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
      throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
      usage: DeepSeekUsage;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("DeepSeek response had no content");
    }

    let json: any;
    try {
      json = safeJsonParse(content);
    } catch {
      throw new Error(`DeepSeek response was not valid JSON: ${content}`);
    }

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const cachedTokens = data.usage.prompt_tokens_details?.cached_tokens ?? 0;
    const costUsd = calculateDeepSeekCostUsd(inputTokens, outputTokens, cachedTokens);
    const durationMs = Date.now() - startedAt;

    if (isResumeFalse(json.is_resume)) {
      return {
        provider: "deepseek",
        isResume: false,
        reason: json.reason ?? "Uploaded document does not appear to be a resume.",
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
      };
    }

    return {
      provider: "deepseek",
      isResume: true,
      data: json,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
    };
  } catch (err) {
    return {
      provider: "deepseek",
      isResume: false,
      costUsd: 0,
      durationMs: Date.now() - startedAt,
      error: (err as Error).message,
    };
  }
}
