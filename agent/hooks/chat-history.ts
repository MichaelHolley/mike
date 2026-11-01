import { reply } from "eve/events";
import { defineHook } from "eve/hooks";
import { historyChannelId, recordEntry, speakerName } from "#lib/chat/history.js";

export default defineHook({
  events: {
    // Recorded at settle, not on receipt, so the turn's own message never shows up
    // in the history its dynamic instructions replay.
    "turn.settled"(event, ctx) {
      const auth = ctx.session.auth.current;
      const channelId = historyChannelId(auth);
      if (!channelId) return;
      const message = textOf(ctx.turn?.input ?? []);
      if (message) recordEntry(channelId, { role: "user", author: speakerName(auth), text: message });
      if (event.data.outcome !== "completed") return;
      const answer = textOf(reply(ctx.view, event.data.turnId).map((part) => ({ kind: part.kind, text: part.value })));
      if (answer) recordEntry(channelId, { role: "agent", author: ctx.agent.name, text: answer });
    },
  },
});

function textOf(parts: readonly { kind?: string; text?: unknown }[]): string {
  return parts
    .filter((part) => (part.kind ?? "text") === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n\n");
}
