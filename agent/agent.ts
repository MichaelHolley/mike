import { defineAgent } from "eve";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { getModel, getModelContextWindowTokens } from "#lib/model-config.js";

export default defineAgent({
  model: openrouter(getModel()),
  // Direct provider model isn't in the AI Gateway catalog, so eve can't
  // resolve the context window for compaction. Set it explicitly — override
  // OPENROUTER_MODEL_CONTEXT_WINDOW_TOKENS if OPENROUTER_MODEL points at a
  // model with a different window than the default.
  modelContextWindowTokens: getModelContextWindowTokens(),
});
