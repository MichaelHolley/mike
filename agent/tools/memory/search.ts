import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchMemories } from "#lib/memory/store.js";

const MAX_RESULTS = 20;

export default defineTool({
  description:
    "Search stored memories by case-insensitive substring of their title, " +
    "description or content, best matches first. Each result has the memory's " +
    "id, title, description and a snippet around the match; call memory-read " +
    "with the id for the full content.",
  inputSchema: z.object({
    query: z.string().trim().min(1).describe("Word or phrase to find in memories."),
    limit: z.number().int().min(1).max(MAX_RESULTS).default(10),
  }),
  outputSchema: z.object({
    matches: z.array(
      z.object({
        id: z.number().int(),
        title: z.string(),
        description: z.string(),
        snippet: z.string(),
      }),
    ),
  }),
  execute({ query, limit }) {
    return { matches: searchMemories(query, limit) };
  },
  toModelOutput(output) {
    if (output.matches.length === 0) {
      return { type: "text", value: "No memories match." };
    }
    return { type: "text", value: JSON.stringify(output.matches) };
  },
});
