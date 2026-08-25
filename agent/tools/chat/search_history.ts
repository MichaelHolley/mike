import { defineTool } from "eve/tools";
import { z } from "zod";
import { historyChannelId, searchHistory } from "#lib/chat/history.js";

const MAX_OUTPUT_CHARS = 8000;

export default defineTool({
  description:
    "Search this Discord channel's full stored conversation history with a jq filter. " +
    "The history is a JSON array of `{ role, author, text, at }` objects, oldest first, and your " +
    "filter runs over that array. Use it to recall things beyond the most recent messages already " +
    'shown each turn — e.g. `map(select(.text | test("deploy"; "i")))` or `[.[] | select(.author == "alice") | .text]`. ' +
    "Only searches the channel it is called from.",
  inputSchema: z.object({
    filter: z
      .string()
      .min(1)
      .describe('A jq filter applied to the history array, e.g. `map(select(.author == "alice"))`.'),
  }),
  outputSchema: z.object({
    supported: z.boolean(),
    ok: z.boolean(),
    results: z.array(z.unknown()).optional(),
    error: z.string().optional(),
  }),
  async execute({ filter }, ctx) {
    const channelId = historyChannelId(ctx.session.auth.current);
    if (!channelId) return { supported: false, ok: false };
    const outcome = await searchHistory(channelId, filter);
    return outcome.ok
      ? { supported: true, ok: true, results: outcome.results }
      : { supported: true, ok: false, error: outcome.error };
  },
  toModelOutput(output) {
    if (!output.supported) {
      return { type: "text", value: "Conversation history is only recorded on Discord." };
    }
    if (!output.ok) {
      return { type: "text", value: `jq filter failed: ${output.error}` };
    }
    const json = JSON.stringify(output.results ?? []);
    const value =
      json.length > MAX_OUTPUT_CHARS ? `${json.slice(0, MAX_OUTPUT_CHARS)}\n…(truncated)` : json;
    return { type: "text", value };
  },
});
