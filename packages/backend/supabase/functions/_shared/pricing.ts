// Operator-side cost estimate — what WE pay Groq / OpenRouter per rewrite.
//
// This is NOT user-facing pricing (that's MODE_CREDITS in types.ts). It exists
// only to populate usage_log.cost_usd_micros so the cost_daily rollup can show
// real spend by provider/model. Keep the rates in sync with the routing table
// in routing.ts and update when a provider changes prices.
//
// Rates are USD per 1,000,000 tokens. Handy identity: a "USD per 1M tokens"
// value is numerically equal to micro-USD per token, so
//   cost_usd_micros = inputTokens * inUsdPerMTok + outputTokens * outUsdPerMTok
// stays in integer micro-dollars without any 1e6 juggling.

interface ModelPrice {
  inUsdPerMTok: number;
  outUsdPerMTok: number;
}

// Models we actually route to (see routing.ts). Unknown models fall through to
// 0 so we never log a fabricated cost — better a visible 0 than a wrong number.
const PRICES: Record<string, ModelPrice> = {
  "llama-3.1-8b-instant": { inUsdPerMTok: 0.05, outUsdPerMTok: 0.08 },
  "llama-3.3-70b-versatile": { inUsdPerMTok: 0.59, outUsdPerMTok: 0.79 },
  "anthropic/claude-sonnet-4.6": { inUsdPerMTok: 3, outUsdPerMTok: 15 },
};

/**
 * Estimated USD cost (in micro-dollars, USD * 1_000_000) of a single rewrite.
 * Returns 0 for models with no known price so the column stays honest.
 */
export function estimateCostUsdMicros(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICES[model];
  if (!p) return 0;
  return Math.round(
    inputTokens * p.inUsdPerMTok + outputTokens * p.outUsdPerMTok,
  );
}
