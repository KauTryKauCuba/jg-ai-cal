export interface ProviderResult {
  provider: "deepseek" | "mistral" | "groq" | "mimo";
  isResume: boolean;
  reason?: string;
  data?: any;
  inputTokens?: number;
  outputTokens?: number;
  pagesProcessed?: number;
  costUsd: number;
  durationMs: number;
  error?: string;
}
