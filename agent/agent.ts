import { defineAgent } from "eve";
import { openrouter } from "@openrouter/ai-sdk-provider";

export default defineAgent({
  model: openrouter("openai/gpt-5.4-mini"),
  // Direct provider model isn't in the AI Gateway catalog, so eve can't
  // resolve the context window for compaction. Set it explicitly.
  modelContextWindowTokens: 400_000,
});
