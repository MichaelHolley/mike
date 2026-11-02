import { defineDynamic, defineInstructions } from "eve/instructions";
import { historyChannelId, loadHistoryBlock } from "#lib/chat/history.js";

export default defineDynamic(async (ctx) => {
  if (!ctx.turn) return null;
  const channelId = historyChannelId(ctx.session.auth.current);
  if (!channelId) return null;
  // Loaded once per turn so the prompt stays fixed across the turn's model calls.
  const block = await ctx.memo(["chat-history", ctx.turn.id], () => loadHistoryBlock(channelId));
  return block ? defineInstructions({ content: block }) : null;
});
