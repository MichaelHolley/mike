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

function renderResults(total: number, matches: readonly z.infer<typeof entrySchema>[]): string {
  const newestMatches = [] as z.infer<typeof entrySchema>[];
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const entry = matches[index];
    const candidate = [entry, ...newestMatches];
    if (JSON.stringify({ total, matches: candidate }).length > MAX_OUTPUT_CHARS) break;
    newestMatches.unshift(entry);
  }
  return JSON.stringify({ total, matches: newestMatches });
}

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
    available: z.boolean(),
    total: z.number().int().optional(),
    matches: z.array(entrySchema).optional(),
  }),
  async execute({ query, limit }, ctx) {
    const channelId = historyChannelId(ctx.session.auth.current);
    if (!channelId) return { supported: false, available: false };
    const result = await searchHistory(channelId, query, limit);
    return result
      ? { supported: true, available: true, ...result }
      : { supported: true, available: false };
  },
  toModelOutput(output) {
    if (!output.supported) {
      return { type: "text", value: "Conversation history is only recorded on Discord." };
    }
    if (!output.available) {
      return { type: "text", value: "Conversation history is temporarily unavailable." };
    }
    return { type: "text", value: renderResults(output.total ?? 0, output.matches ?? []) };
  },
});
