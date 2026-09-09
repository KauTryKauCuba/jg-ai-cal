import { jsonrepair } from "jsonrepair";

// Vision models occasionally drop or malform a character mid-response, especially
// with reasoning disabled (no self-check pass before committing to output).
// Try a straight parse first, then fall back to jsonrepair before giving up.
export function safeJsonParse(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    return JSON.parse(jsonrepair(content));
  }
}

// DeepSeek/Groq/MiMo aren't given a JSON schema (unlike Mistral), so is_resume
// can come back as the string "false" instead of the boolean — a strict
// `=== false` check would miss that and treat it as a valid resume.
export function isResumeFalse(value: unknown): boolean {
  if (value === false) return true;
  if (typeof value === "string") return value.trim().toLowerCase() === "false";
  return false;
}

// Qwen (Groq) embeds chain-of-thought as inline <think>...</think> tags within
// the message content itself, rather than a separate reasoning field like
// DeepSeek/MiMo — strip it so only the final answer/JSON is returned.
export function stripThinkTags(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}
