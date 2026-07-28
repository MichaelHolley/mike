import { defineHook } from "eve/hooks";
import { historyScope, recordEntry, speakerName } from "../lib/chat-history.js";

export default defineHook({
  events: {
    async "message.received"(event, ctx) {
      const auth = ctx.session.auth.current;
      const scope = historyScope(ctx.channel.kind, auth);
      if (!scope) return;
      await recordEntry(scope, {
        role: "user",
        author: speakerName(auth),
        text: event.data.message,
      });
    },
    async "message.completed"(event, ctx) {
      // Skip intermediate tool-call turns; record only what the user was sent.
      if (event.data.finishReason === "tool-calls") return;
      if (!event.data.message) return;
      const scope = historyScope(ctx.channel.kind, ctx.session.auth.current);
      if (!scope) return;
      await recordEntry(scope, {
        role: "agent",
        author: ctx.agent.name,
        text: event.data.message,
      });
    },
  },
});
