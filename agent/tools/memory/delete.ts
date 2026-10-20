import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { deleteMemory, readMemory } from "#lib/memory/store.js";

export default defineTool({
  description:
    "Permanently delete a stored memory. Use when a memory is wrong or no " +
    "longer relevant. Pass both its id and its current title.",
  inputSchema: z.object({
    id: z.number().int().describe("Id of the memory to delete."),
    title: z
      .string()
      .trim()
      .min(1)
      .describe("Exact current title of the memory to delete, as shown by memory-list."),
  }),
  outputSchema: z.object({
    id: z.number().int(),
    title: z.string(),
    deleted: z.boolean(),
  }),
  approval: always(),
  execute({ id, title }) {
    const memory = readMemory(id);
    if (!memory) return { id, title, deleted: false };
    // The person approved the title they were shown, so never delete a different memory.
    if (memory.title !== title) {
      throw new Error(
        `Memory ${id} is titled "${memory.title}", not "${title}". Nothing was deleted.`,
      );
    }
    return { id, title, deleted: deleteMemory(id) };
  },
  toModelOutput(output) {
    return {
      type: "text",
      value: output.deleted
        ? `Deleted memory ${output.id} "${output.title}".`
        : `No memory with id ${output.id} to delete.`,
    };
  },
});
