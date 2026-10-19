import { defineTool } from "eve/tools";
import { z } from "zod";
import { createMemory, updateMemory } from "#lib/memory/store.js";

export default defineTool({
  description:
    "Save a memory so it persists across conversations. Without an id it " +
    "creates a new memory and needs title, description and content. With an " +
    "id it updates that memory: only the fields you pass change, but content " +
    "is replaced as a whole — to add to it, memory-read first and pass the " +
    "full combined content.",
  inputSchema: z.object({
    id: z
      .number()
      .int()
      .optional()
      .describe("Id of the memory to update. Omit to create a new memory."),
    title: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Short descriptive title, e.g. 'User preferences'."),
    description: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        "One short line summarizing this memory, shown in the memory map so " +
          "you can decide whether to read the full content later.",
      ),
    content: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Full Markdown content of the memory. Replaces any prior content, so " +
          "include everything worth keeping.",
      ),
  }),
  outputSchema: z.object({
    id: z.number().int(),
    created: z.boolean(),
  }),
  execute({ id, title, description, content }) {
    if (id === undefined) {
      if (!title || !description || !content) {
        throw new Error("Creating a memory needs title, description and content.");
      }
      return { id: createMemory({ title, description, content }), created: true };
    }
    if (title === undefined && description === undefined && content === undefined) {
      throw new Error("Pass at least one of title, description or content to update.");
    }
    if (!updateMemory(id, { title, description, content })) {
      throw new Error(`No memory with id ${id}.`);
    }
    return { id, created: false };
  },
  toModelOutput(output) {
    return {
      type: "text",
      value: `${output.created ? "Created" : "Updated"} memory ${output.id}.`,
    };
  },
});
