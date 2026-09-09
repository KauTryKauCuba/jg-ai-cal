// DeepSeek deepseek-v4-flash-vision-exp shares deepseek-v4-flash pricing.
// Verify against https://api-docs.deepseek.com before relying on these for real billing decisions.
export const DEEPSEEK_PRICING_PER_MILLION_TOKENS_USD = {
  offPeak: { cacheHitInput: 0.007, cacheMissInput: 0.22, output: 0.66 },
  peak: { cacheHitInput: 0.014, cacheMissInput: 0.44, output: 1.32 },
};

// TODO: DeepSeek publishes discounted off-peak hours (UTC), but the exact window
// should be re-verified against https://api-docs.deepseek.com before trusting this
// automatically — for now this always uses the safer (higher) peak rate.
export function calculateDeepSeekCostUsd(
  inputTokens: number,
  outputTokens: number,
  cacheHitTokens = 0
): number {
  const rates = DEEPSEEK_PRICING_PER_MILLION_TOKENS_USD.peak;

  const cacheMissTokens = Math.max(inputTokens - cacheHitTokens, 0);

  const cost =
    (cacheHitTokens / 1_000_000) * rates.cacheHitInput +
    (cacheMissTokens / 1_000_000) * rates.cacheMissInput +
    (outputTokens / 1_000_000) * rates.output;

  return Number(cost.toFixed(6));
}

// mistral-ocr-latest pricing — verify current rate at https://mistral.ai/pricing
// before relying on this for real billing decisions; rates have ranged $2-4 per 1,000 pages
// depending on OCR version.
export const MISTRAL_PRICING_PER_1000_PAGES_USD = 3;

export function calculateMistralCostUsd(pagesProcessed: number): number {
  const cost = (pagesProcessed / 1000) * MISTRAL_PRICING_PER_1000_PAGES_USD;
  return Number(cost.toFixed(6));
}

// qwen/qwen3.6-27b on Groq — verify current rate at https://groq.com/pricing
// before relying on this for real billing decisions.
export const GROQ_PRICING_PER_MILLION_TOKENS_USD = {
  input: 0.6,
  output: 3.0,
};

export function calculateGroqCostUsd(
  inputTokens: number,
  outputTokens: number
): number {
  const cost =
    (inputTokens / 1_000_000) * GROQ_PRICING_PER_MILLION_TOKENS_USD.input +
    (outputTokens / 1_000_000) * GROQ_PRICING_PER_MILLION_TOKENS_USD.output;
  return Number(cost.toFixed(6));
}

// mimo-v2.5 on Xiaomi's first-party API — verify current rate at
// https://mimo.mi.com/docs/price/pay-as-you-go before relying on this for real billing decisions.
export const MIMO_PRICING_PER_MILLION_TOKENS_USD = {
  input: 0.14,
  output: 0.28,
  cacheHitInput: 0.003,
};

export function calculateMimoCostUsd(
  inputTokens: number,
  outputTokens: number,
  cacheHitTokens = 0
): number {
  const cacheMissTokens = Math.max(inputTokens - cacheHitTokens, 0);
  const cost =
    (cacheHitTokens / 1_000_000) * MIMO_PRICING_PER_MILLION_TOKENS_USD.cacheHitInput +
    (cacheMissTokens / 1_000_000) * MIMO_PRICING_PER_MILLION_TOKENS_USD.input +
    (outputTokens / 1_000_000) * MIMO_PRICING_PER_MILLION_TOKENS_USD.output;
  return Number(cost.toFixed(6));
}
