import { defineAgent } from "eve";
import { openrouter } from "@openrouter/ai-sdk-provider";

const DEFAULT_MODEL = "openai/gpt-5.4-mini";
const DEFAULT_MODEL_CONTEXT_WINDOW_TOKENS = 400_000;

const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

const modelContextWindowTokens = process.env.OPENROUTER_MODEL_CONTEXT_WINDOW_TOKENS
  ? Number(process.env.OPENROUTER_MODEL_CONTEXT_WINDOW_TOKENS)
  : DEFAULT_MODEL_CONTEXT_WINDOW_TOKENS;

if (!Number.isFinite(modelContextWindowTokens) || modelContextWindowTokens <= 0) {
  throw new Error(
    `OPENROUTER_MODEL_CONTEXT_WINDOW_TOKENS must be a positive number, got "${process.env.OPENROUTER_MODEL_CONTEXT_WINDOW_TOKENS}".`,
  );
}

export default defineAgent({
  model: openrouter(model),
  // Direct provider model isn't in the AI Gateway catalog, so eve can't
  // resolve the context window for compaction. Set it explicitly — override
  // OPENROUTER_MODEL_CONTEXT_WINDOW_TOKENS if OPENROUTER_MODEL points at a
  // model with a different window than the default.
  modelContextWindowTokens,
});
