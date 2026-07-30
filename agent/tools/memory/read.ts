import { defineTool } from "eve/tools";
import { z } from "zod";
import { getBlob } from "#lib/blob.js";
import { canonicalMemoryName, toMemoryPath } from "#lib/memory/path.js";

export default defineTool({
  description:
    "Read the full content of a stored memory by name. Use the names returned " +
    "by memory-list.",
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
    content: z.string().nullable(),
  }),
  async execute({ name }) {
    const slug = canonicalMemoryName(name);
    const content = await getBlob(toMemoryPath(slug));
    return { name: slug, content };
  },
  toModelOutput(output) {
    if (output.content === null) {
      return { type: "text", value: `No memory named "${output.name}".` };
    }
    return { type: "text", value: output.content };
  },
});
