import { defineTool } from "eve/tools";
import { z } from "zod";
import { listMemories } from "#lib/memory/store.js";

export default defineTool({
  description:
    "List stored memories — persistent notes you have saved across " +
    "conversations. Returns the memory map: each entry's id, title and a short " +
    "description. Call memory-read with an id to get a memory's full content, " +
    "or memory-search to find memories by their text.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    memories: z.array(
      z.object({ id: z.number().int(), title: z.string(), description: z.string() }),
    ),
  }),
  execute() {
    return { memories: listMemories() };
  },
  toModelOutput(output) {
    if (output.memories.length === 0) {
      return { type: "text", value: "No memories stored." };
    }
    return {
      type: "text",
      value: output.memories
        .map((m) => `- [id ${m.id}] ${m.title} — ${m.description}`)
        .join("\n"),
    };
  },
});
