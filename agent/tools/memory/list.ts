import { defineTool } from "eve/tools";
import { z } from "zod";
import { getMemoryIndex } from "../../lib/memory/index-map.js";

export default defineTool({
  description:
    "List stored memories — persistent notes you have saved across " +
    "conversations. Returns the memory map: each entry's name and a short " +
    "description. Call memory-read to get a specific memory's full content.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    index: z.string().nullable(),
  }),
  async execute() {
    return { index: await getMemoryIndex() };
  },
  toModelOutput(output) {
    if (!output.index) {
      return { type: "text", value: "No memories stored." };
    }
    return { type: "text", value: output.index };
  },
});
