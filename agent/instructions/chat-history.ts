import { defineDynamic, defineInstructions } from "eve/instructions";
import { historyScope, loadHistory, renderHistory } from "../lib/chat-history.js";

export default defineDynamic({
  events: {
    // turn.started fires before message.received, so the current message is
    // not yet in storage and cannot be replayed back as past conversation.
    async "turn.started"(_event, ctx) {
      const scope = historyScope(ctx.channel.kind, ctx.session.auth.current);
      if (!scope) return null;
      const entries = await loadHistory(scope);
      return entries.length > 0 ? defineInstructions({ markdown: renderHistory(entries) }) : null;
    },
  },
});
