import { defineTool } from "eve/tools";
import { z } from "zod";
import { clearHistory, historyScopeFromAuth } from "../lib/chat-history.js";

export default defineTool({
  description:
    "Forget the recorded conversation history of the current Discord channel. " +
    "Use when the user asks to reset, wipe, or forget this conversation. " +
    "Always clears the channel it is called from — no other channel can be targeted.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    cleared: z.boolean(),
  }),
  async execute(_input, ctx) {
    const scope = historyScopeFromAuth(ctx.session.auth.current);
    return { cleared: scope ? await clearHistory(scope) : false };
  },
  toModelOutput(output) {
    return {
      type: "text",
      value: output.cleared
        ? "Cleared this channel's conversation history."
        : "There was no stored conversation history to clear.",
    };
  },
});
