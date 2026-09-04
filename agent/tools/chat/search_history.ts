import { defineTool } from "eve/tools";
import { z } from "zod";
import { historyChannelId, searchHistory } from "#lib/chat/history.js";

const MAX_RESULTS = 10;
const MAX_OUTPUT_CHARS = 8000;

const entrySchema = z.object({
  role: z.enum(["user", "agent"]),
  author: z.string(),
  text: z.string(),
  at: z.string(),
});

export default defineTool({
  description:
    "Search older messages stored for this Discord channel by case-insensitive text or author " +
    "substring. Results are the newest matches in chronological order. Use this when the recent " +
    "conversation does not contain context needed to answer the user. Only searches the current channel.",
  inputSchema: z.object({
    query: z.string().trim().min(1).describe("Words or phrase to find in message text or author names."),
    limit: z.number().int().min(1).max(MAX_RESULTS).default(MAX_RESULTS),
  }),
  outputSchema: z.object({
    supported: z.boolean(),
    total: z.number().int().optional(),
    matches: z.array(entrySchema).optional(),
  }),
  async execute({ query, limit }, ctx) {
    const channelId = historyChannelId(ctx.session.auth.current);
    if (!channelId) return { supported: false };
    return { supported: true, ...(await searchHistory(channelId, query, limit)) };
  },
  toModelOutput(output) {
    if (!output.supported) {
      return { type: "text", value: "Conversation history is only recorded on Discord." };
    }
    const json = JSON.stringify({ total: output.total, matches: output.matches });
    return {
      type: "text",
      value:
        json.length > MAX_OUTPUT_CHARS
          ? `${json.slice(0, MAX_OUTPUT_CHARS)}\n…(truncated)`
          : json,
    };
  },
});
