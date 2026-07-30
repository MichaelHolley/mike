import { defineTool } from "eve/tools";
import { z } from "zod";
import { putBlob } from "../../lib/blob.js";
import { canonicalMemoryName, toMemoryPath } from "../../lib/memory/path.js";
import { upsertMemoryIndexEntry } from "../../lib/memory/index-map.js";

export default defineTool({
  description:
    "Save a memory so it persists across conversations. Writing a name that " +
    "already exists REPLACES it — to add to an existing memory, memory-read " +
    "first and write back the full combined content. The memory map is " +
    "updated automatically.",
  inputSchema: z.object({
    name: z
      .string()
      .min(1)
      .describe(
        "Short, stable, descriptive slug identifying the memory, e.g. " +
          "'user-preferences'. Letters, numbers, dashes, underscores, and " +
          "'/' to nest. No 'memory/' prefix or '.md' extension.",
      ),
    description: z
      .string()
      .min(1)
      .describe(
        "One short line summarizing this memory, shown in the memory map " +
          "listing so you can decide whether to read the full content later.",
      ),
    content: z
      .string()
      .min(1)
      .describe(
        "Full Markdown content of the memory. This replaces any prior " +
          "content under the same name, so include everything worth keeping.",
      ),
  }),
  outputSchema: z.object({
    name: z.string(),
  }),
  async execute({ name, description, content }) {
    const slug = canonicalMemoryName(name);
    await putBlob(toMemoryPath(slug), content);
    await upsertMemoryIndexEntry(slug, description);
    return { name: slug };
  },
  toModelOutput(output) {
    return { type: "text", value: `Saved memory "${output.name}".` };
  },
});
