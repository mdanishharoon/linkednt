import {
  maxTokensForMode,
  promptForMode,
  STRICT_OUTPUT_SUFFIX,
  temperatureForMode,
} from "./prompts.ts";
import { getProvider } from "./providers/registry.ts";
import type { Mode, RewriteErrorCode } from "./types.ts";

const LOG = "[linkednt:fn:rw]";

export interface RewriteCallArgs {
  text: string;
  mode: Mode;
  providerId: string;
  apiKey: string;
  model: string;
}

export type RewriteCallResult =
  | { ok: true; rewrite: string }
  | { ok: false; code: RewriteErrorCode; error: string };

/**
 * Runs the per-mode prompt against the chosen provider, applies the same
 * <think>-tag cleanup + strict-suffix retry as the extension's rewriter.
 * Shared logic guarantees BYOK and Proxy paths produce identical-shaped
 * outputs for the same input/mode/model.
 */
export async function runRewrite(
  args: RewriteCallArgs,
): Promise<RewriteCallResult> {
  const provider = getProvider(args.providerId);
  if (!provider) {
    return {
      ok: false,
      code: "PROVIDER_UNKNOWN",
      error: `Unknown provider: ${args.providerId}`,
    };
  }

  async function callOnce(strict: boolean) {
    const basePrompt = promptForMode(args.mode);
    const systemPrompt = strict
      ? basePrompt + STRICT_OUTPUT_SUFFIX
      : basePrompt;
    return await provider!.call({
      systemPrompt,
      userPrompt: args.text,
      model: args.model,
      temperature: temperatureForMode(args.mode, strict),
      maxTokens: maxTokensForMode(args.mode),
      apiKey: args.apiKey,
      reasoningHidden: true,
    });
  }

  const first = await callOnce(false);
  if (!first.ok) return first;

  let output = cleanModelOutput(first.content);

  const retryReason = retryReasonFor(output, args.mode);
  if (retryReason) {
    console.info(`${LOG} retrying`, { reason: retryReason, mode: args.mode });
    const retry = await callOnce(true);
    if (retry.ok) {
      const clean = cleanModelOutput(retry.content);
      if (clean) output = clean;
    }
  }

  if (!output) {
    return { ok: false, code: "EMPTY", error: "Provider returned empty." };
  }
  return { ok: true, rewrite: output };
}

function cleanModelOutput(content: string): string {
  return String(content || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .replace(/^\s*(Translation|Monologue|Summary|Strip):\s*/i, "")
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/, "")
    .trim();
}

function retryReasonFor(result: string, mode: Mode): string | null {
  if (!result) return "empty output";
  if (/<\/?think/i.test(result)) return "<think> tag survived cleaning";
  const trimmed = result.trim();
  if (!/[.!?")']$/.test(trimmed)) return "output does not end in punctuation";
  if (mode === "roast") {
    const lower = trimmed.toLowerCase();
    const hasFirstPerson = /\b(i|i'm|i've|i'd|i'll|my|me|mine)\b/i.test(
      trimmed,
    );
    const secondPersonHits = (
      lower.match(/\b(you|you're|your|you are)\b/g) || []
    ).length;
    if (!hasFirstPerson) return "roast missing first-person voice";
    if (secondPersonHits > 0) return "roast used second-person";
  }
  if (mode === "strip") {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > 28) return `strip exceeded 28 words`;
  }
  return null;
}
