import { defineTool } from "eve/tools";
import { z } from "zod";
import { deleteBlob } from "../../lib/blob.js";
import { canonicalMemoryName, toMemoryPath } from "../../lib/memory/path.js";
import { removeMemoryIndexEntry } from "../../lib/memory/index-map.js";

export default defineTool({
  description:
    "Permanently delete a stored memory by name. Use when a memory is wrong " +
    "or no longer relevant.",
  inputSchema: z.object({
    name: z
      .string()
      .min(1)
      .describe(
        "Memory name as shown by memory-list, e.g. 'user-preferences'. Do " +
          "not include the 'memory/' prefix or the '.md' extension.",
      ),
  }),
  outputSchema: z.object({
    name: z.string(),
    deleted: z.boolean(),
  }),
  async execute({ name }) {
    const slug = canonicalMemoryName(name);
    // Prune the index unconditionally so a stale entry whose blob is already
    // gone (404) still gets reconciled out of the map.
    const deleted = await deleteBlob(toMemoryPath(slug));
    await removeMemoryIndexEntry(slug);
    return { name: slug, deleted };
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
