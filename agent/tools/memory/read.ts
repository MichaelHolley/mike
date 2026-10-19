import { defineTool } from "eve/tools";
import { z } from "zod";
import { readMemory } from "#lib/memory/store.js";

export default defineTool({
  description:
    "Read the full content of a stored memory by id. Use the ids returned by " +
    "memory-list or memory-search.",
  inputSchema: z.object({
    id: z.number().int().describe("Memory id as shown by memory-list or memory-search."),
  }),
  outputSchema: z.object({
    id: z.number().int(),
    memory: z
      .object({
        title: z.string(),
        description: z.string(),
        content: z.string(),
        updatedAt: z.string(),
      })
      .nullable(),
  }),
  execute({ id }) {
    return { id, memory: readMemory(id) };
  },
  toModelOutput(output) {
    if (!output.memory) {
      return { type: "text", value: `No memory with id ${output.id}.` };
    }
    const { title, description, content, updatedAt } = output.memory;
    return {
      type: "text",
      value: `# ${title}\n\n_${description}_ (id ${output.id}, updated ${updatedAt})\n\n${content}`,
    };
  },
});
