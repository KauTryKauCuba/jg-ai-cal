import { stripThinkTags } from "./json.js";
import {
  calculateDeepSeekCostUsd,
  calculateGroqCostUsd,
  calculateMimoCostUsd,
} from "./pricing.js";

const CALC_SYSTEM_PROMPT =
  "You are a calculator assistant. You must REFUSE to answer any question " +
  "that is not a numeric/mathematical calculation, even if you know the " +
  "answer. Only answer arithmetic, age-from-birth-year, unit conversion, " +
  'percentages, date differences, and similar calculations. For example, if ' +
  'asked "what is the capital of France?", you must reply with a short ' +
  'refusal like "I can only help with calculations." in the same language as ' +
  "the question, and must NOT say Paris or any other factual answer. Think " +
  "through the calculation carefully and double-check your arithmetic before " +
  "answering, but your final answer must still be as short as possible — " +
  "ideally just the resulting value or a single sentence, with no shown " +
  "working-out. Always respond in the same language the question was asked in.";

export type CalcChatResult =
  | {
      answer: string;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      durationMs: number;
    }
  | { error: string };

interface CalcUsage {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

async function chatCompletion(opts: {
  url: string;
  apiKey: string;
  model: string;
  question: string;
  extraBody?: Record<string, unknown>;
  calculateCostUsd: (
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number
  ) => number;
  stripThink?: boolean;
}): Promise<CalcChatResult> {
  const startedAt = Date.now();
  try {
    const response = await fetch(opts.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        // reasoning is enabled (no thinking-disabled flag) for better accuracy on
        // tricky calculations, so this needs generous headroom for the hidden
        // reasoning tokens (some models reason quite verbosely) plus a short
        // final answer — too little and the response gets cut off mid-thought.
        max_tokens: 2000,
        messages: [
          { role: "system", content: CALC_SYSTEM_PROMPT },
          { role: "user", content: opts.question },
        ],
        ...opts.extraBody,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
      usage: CalcUsage;
    };

    let content = data.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error(
        "Response had no content (the model may have run out of room while reasoning)"
      );
    }
    if (opts.stripThink) {
      if (content.includes("<think>") && !content.includes("</think>")) {
        // reasoning got cut off before a final answer was reached
        throw new Error("The model ran out of room while reasoning — please try again.");
      }
      content = stripThinkTags(content);
    }

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const cachedTokens = data.usage.prompt_tokens_details?.cached_tokens ?? 0;

    return {
      answer: content,
      inputTokens,
      outputTokens,
      costUsd: opts.calculateCostUsd(inputTokens, outputTokens, cachedTokens),
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function askDeepSeekCalc(question: string): Promise<CalcChatResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { error: "DEEPSEEK_API_KEY is not set" };
  return chatCompletion({
    url: "https://api.deepseek.com/v1/chat/completions",
    apiKey,
    model: "deepseek-v4-flash",
    question,
    calculateCostUsd: (input, output, cached) =>
      calculateDeepSeekCostUsd(input, output, cached),
  });
}

export async function askGroqCalc(question: string): Promise<CalcChatResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { error: "GROQ_API_KEY is not set" };
  return chatCompletion({
    url: "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    model: "qwen/qwen3.6-27b",
    question,
    calculateCostUsd: (input, output) => calculateGroqCostUsd(input, output),
    stripThink: true,
  });
}

export async function askMimoCalc(question: string): Promise<CalcChatResult> {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) return { error: "MIMO_API_KEY is not set" };
  return chatCompletion({
    url: "https://api.xiaomimimo.com/v1/chat/completions",
    apiKey,
    model: "mimo-v2.5",
    question,
    calculateCostUsd: (input, output, cached) => calculateMimoCostUsd(input, output, cached),
  });
}
