import { useState } from "react";
import GradientChatInput from "@/components/ui/gradient-chat-input";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { UsageBox } from "../components/UsageBox";

type CalcProvider = "deepseek" | "groq" | "mimo";

const PROVIDER_LABELS: Record<CalcProvider, string> = {
  deepseek: "DeepSeek",
  groq: "Groq",
  mimo: "MiMo",
};

const PROVIDER_OPTIONS = (Object.keys(PROVIDER_LABELS) as CalcProvider[]).map((value) => ({
  value,
  label: PROVIDER_LABELS[value],
}));

const MAX_QUESTIONS = 3;

interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
}

export default function ChatPage() {
  const [provider, setProvider] = useState<CalcProvider>("deepseek");
  const [askedCount, setAskedCount] = useState(0);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const limitReached = askedCount >= MAX_QUESTIONS;

  function resetSession() {
    setAskedCount(0);
    setUsage(null);
    setSessionKey((k) => k + 1); // remounts GradientChatInput, clearing its bubbles
  }

  async function askQuestion(question: string): Promise<string> {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, question }),
      });
      const json = (await res.json()) as {
        answer?: string;
        error?: string;
        input_tokens?: number;
        output_tokens?: number;
        cost_usd?: number;
        duration_ms?: number;
      };

      if (!res.ok || !json.answer) {
        // Don't count a failed attempt against the question limit — only a
        // real answer should use up one of the 3 allowed questions.
        console.error("Chat request failed:", json.error ?? res.status);
        return json.error ?? "Something went wrong, please try again.";
      }

      setAskedCount((n) => n + 1);

      if (
        json.input_tokens !== undefined &&
        json.output_tokens !== undefined &&
        json.cost_usd !== undefined &&
        json.duration_ms !== undefined
      ) {
        setUsage({
          inputTokens: json.input_tokens,
          outputTokens: json.output_tokens,
          costUsd: json.cost_usd,
          durationMs: json.duration_ms,
        });
      }

      return json.answer;
    } catch (err) {
      console.error("Chat request threw:", err);
      return "Something went wrong, please try again.";
    }
  }

  return (
    <div className="relative flex min-h-[400px] w-full flex-col items-center justify-center gap-4 p-4 sm:p-8">
      <GradientChatInput
        key={sessionKey}
        placeholder="Ask a calculation, e.g. what's 12% of 350?"
        autoReply={null}
        disabled={limitReached}
        onSend={askQuestion}
      />

      <label className="flex items-center gap-2 text-sm text-[var(--text-mute)]">
        Assistant:
        <SelectDropdown
          value={provider}
          options={PROVIDER_OPTIONS}
          onChange={(v) => setProvider(v as CalcProvider)}
          disabled={askedCount > 0}
        />
      </label>

      {usage && (
        <UsageBox
          inputTokens={usage.inputTokens}
          outputTokens={usage.outputTokens}
          costUsd={usage.costUsd}
          durationMs={usage.durationMs}
        />
      )}

      <p className="text-xs text-[var(--text-mute)]">
        {limitReached
          ? `Limit of ${MAX_QUESTIONS} questions reached.`
          : `Questions asked: ${askedCount}/${MAX_QUESTIONS}`}
      </p>

      <button
        type="button"
        onClick={resetSession}
        className="h-[29.6px] rounded-full border border-[var(--input)] px-4 text-xs font-medium text-[var(--text-mute)] transition-colors hover:bg-[var(--canvas-soft)]"
      >
        Reset
      </button>
    </div>
  );
}
