import { defineDynamic, defineInstructions } from "eve/instructions";
import { historyChannelId, loadHistoryBlock } from "../lib/chat-history.js";

export default defineDynamic({
  events: {
    // turn.started fires before message.received, so the current message is
    // not yet in storage and cannot be replayed back as past conversation.
    async "turn.started"(_event, ctx) {
      const channelId = historyChannelId(ctx.session.auth.current);
      if (!channelId) return null;
      const block = await loadHistoryBlock(channelId);
      return block ? defineInstructions({ markdown: block }) : null;
    },
  },
});
