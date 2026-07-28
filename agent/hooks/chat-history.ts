import { defineHook } from "eve/hooks";
import {
  historyChannelId,
  recordEntry,
  speakerName,
} from "../lib/chat-history.js";

export default defineHook({
  events: {
    async "message.received"(event, ctx) {
      const auth = ctx.session.auth.current;
      const channelId = historyChannelId(ctx.channel.kind, auth);
      if (!channelId) {
        console.warn(
          `chat history not recorded: no channel for kind ${ctx.channel.kind}`,
        );
        return;
      }
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
      const channelId = historyChannelId(
        ctx.channel.kind,
        ctx.session.auth.current,
      );
      if (!channelId) {
        console.warn(
          `chat history not recorded: no channel for kind ${ctx.channel.kind}`,
        );
        return;
      }
      await recordEntry(channelId, {
        role: "agent",
        author: ctx.agent.name,
        text: event.data.message,
      });
    },
  },
});
