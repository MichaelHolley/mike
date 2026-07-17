import { defineTool } from "eve/tools";
import { z } from "zod";
import { deleteBlob } from "../lib/blob-bunny.js";
import { toMemoryPath } from "../lib/memory-path.js";
import { removeMemoryIndexEntry } from "../lib/memory-index.js";

export default defineTool({
  description:
    "Permanently delete a stored memory by name. Use when a memory is wrong " +
    "or no longer relevant.",
  inputSchema: z.object({
    name: z
      .string()
      .min(1)
      .describe(
        "Memory name as shown by list_memory, e.g. 'user-preferences'. Do " +
          "not include the 'memory/' prefix or the '.md' extension.",
      ),
  }),
  outputSchema: z.object({
    name: z.string(),
    deleted: z.boolean(),
  }),
  async execute({ name }) {
    const deleted = await deleteBlob(toMemoryPath(name));
    if (deleted) {
      await removeMemoryIndexEntry(name);
    }
    return { name, deleted };
  },
  toModelOutput(output) {
    return {
      type: "text",
      value: output.deleted
        ? `Deleted memory "${output.name}".`
        : `No memory named "${output.name}" to delete.`,
    };
  },
});
