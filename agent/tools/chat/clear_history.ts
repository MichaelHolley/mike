import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { clearHistory, historyChannelId } from "#lib/chat/history.js";

export default defineTool({
  description:
    "Forget the recorded conversation history of the current Discord channel. " +
    "Use when the user asks to reset, wipe, or forget this conversation. " +
    "Always clears the channel it is called from — no other channel can be targeted.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    supported: z.boolean(),
    cleared: z.boolean(),
  }),
  approval: always(),
  async execute(_input, ctx) {
    const channelId = historyChannelId(ctx.session.auth.current);
    if (!channelId) return { supported: false, cleared: false };
    return { supported: true, cleared: await clearHistory(channelId) };
  },
  toModelOutput(output) {
    if (!output.supported) {
      return { type: "text", value: "Conversation history is only recorded on Discord." };
    }
    return {
      type: "text",
      value: output.cleared
        ? "Cleared this channel's conversation history."
        : "There was no stored conversation history to clear.",
    };
  },
});
