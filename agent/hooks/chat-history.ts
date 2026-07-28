import { defineHook } from "eve/hooks";
import { historyChannelId, recordEntry, speakerName } from "../lib/chat-history.js";

export default defineHook({
  events: {
    async "message.received"(event, ctx) {
      const auth = ctx.session.auth.current;
      const channelId = historyChannelId(auth);
      if (!channelId) return;
      await recordEntry(channelId, {
        role: "user",
        author: speakerName(auth),
        text: event.data.message,
      });
    },
    async "message.completed"(event, ctx) {
      // Skip intermediate tool-call turns; record only what the user was sent.
      if (event.data.finishReason === "tool-calls") return;
      if (!event.data.message) return;
      const channelId = historyChannelId(ctx.session.auth.current);
      if (!channelId) return;
      await recordEntry(channelId, {
        role: "agent",
        author: ctx.agent.name,
        text: event.data.message,
      });
    },
  },
});
