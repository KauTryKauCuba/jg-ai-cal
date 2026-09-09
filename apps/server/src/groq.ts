import { EXTRACTION_PROMPT } from "./prompts.js";
import { isResumeFalse, safeJsonParse, stripThinkTags } from "./json.js";
import { calculateGroqCostUsd } from "./pricing.js";
import type { ProviderResult } from "./types.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "qwen/qwen3.6-27b";

interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

export async function extractResumeFromImages(
  base64Images: string[]
): Promise<ProviderResult> {
  const startedAt = Date.now();
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set");
    }

    const imageContent = base64Images.map((base64) => ({
      type: "image_url" as const,
      image_url: { url: `data:image/png;base64,${base64}`, detail: "high" as const },
    }));

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: "none",
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
      throw new Error(`Groq API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
      usage: GroqUsage;
    };

    const rawContent = data.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Groq response had no content");
    }
    const content = stripThinkTags(rawContent);

    let json: any;
    try {
      json = safeJsonParse(content);
    } catch {
      throw new Error(`Groq response was not valid JSON: ${content}`);
    }

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const costUsd = calculateGroqCostUsd(inputTokens, outputTokens);
    const durationMs = Date.now() - startedAt;

    if (isResumeFalse(json.is_resume)) {
      return {
        provider: "groq",
        isResume: false,
        reason: json.reason ?? "Uploaded document does not appear to be a resume.",
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
      };
    }

    return {
      provider: "groq",
      isResume: true,
      data: json,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
    };
  } catch (err) {
    return {
      provider: "groq",
      isResume: false,
      costUsd: 0,
      durationMs: Date.now() - startedAt,
      error: (err as Error).message,
    };
  }
}
