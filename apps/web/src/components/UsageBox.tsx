// Fixed approximate rate for display purposes only — not a live FX feed.
export const USD_TO_MYR_RATE = 4.7;

export function UsageBox({
  inputTokens,
  outputTokens,
  pagesProcessed,
  costUsd,
  durationMs,
}: {
  inputTokens?: number;
  outputTokens?: number;
  pagesProcessed?: number;
  costUsd: number;
  durationMs: number;
}) {
  const costMyr = costUsd * USD_TO_MYR_RATE;
  return (
    <div className="usage-box">
      {inputTokens !== undefined && <span>Input tokens: {inputTokens}</span>}
      {outputTokens !== undefined && <span>Output tokens: {outputTokens}</span>}
      {pagesProcessed !== undefined && (
        <span>Pages processed: {pagesProcessed}</span>
      )}
      <span>
        Cost: ${costUsd.toFixed(6)} (~RM {costMyr.toFixed(6)})
      </span>
      <span>Time: {(durationMs / 1000).toFixed(1)}s</span>
    </div>
  );
}
